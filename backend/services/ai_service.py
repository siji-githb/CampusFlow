import openai
from openai import OpenAI
from fastapi import HTTPException
from config import get_settings
from datetime import date, datetime
import json
import re
from services.notification_service import notify_staff_urgent_message
from deps import get_supabase_admin as get_admin

settings = get_settings()


def get_openai_client():
    return OpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
    )


def get_system_prompt():
    """Build the system prompt with current transaction types and office config."""
    admin = get_admin()

    try:
        tt_res = admin.table("transaction_types").select("*").eq("is_active", True).execute()
        transaction_types = tt_res.data
    except Exception:
        transaction_types = []

    try:
        config_res = admin.table("office_config").select("*").execute()
        config = {row["key"]: row["value"] for row in config_res.data}
    except Exception:
        config = {}

    def format_12hr(time_str):
        try:
            return datetime.strptime(time_str, "%H:%M").strftime("%I:%M %p").lstrip("0")
        except Exception:
            return time_str

    open_time = format_12hr(config.get('office_open_time', '08:00'))
    close_time = format_12hr(config.get('office_close_time', '17:00'))

    tt_info = ""
    for tt in transaction_types:
        tt_info += f"\n- {tt['name']}: requires {', '.join(tt.get('required_documents') or [])}"

    return f"""You are CampusFlow Assistant, an AI scheduling helper for the Registrar's Office of Cebu Roosevelt Memorial Colleges (CRMC).

You help students with:
1. Booking, modifying, or cancelling appointments
2. Answering FAQs about registrar transactions
3. Telling students what documents they need to bring
4. Explaining the step-by-step process for each transaction

AVAILABLE TRANSACTION TYPES:{tt_info}

OFFICE HOURS: {open_time} - {close_time}, Monday to Saturday
SLOT DURATION: {config.get('slot_duration_minutes', '30')} minutes per slot
BOOKING CUTOFF: At least {config.get('booking_cutoff_days', '1')} day(s) in advance

TODAY'S DATE: {date.today().strftime('%B %d, %Y')} ({date.today().strftime('%A')})

IMPORTANT RULES:
- You can only book appointments from Monday to Saturday
- Students must bring ALL required documents on their appointment date
- Appointments can be cancelled before the cutoff period
- If a student mentions "GWA", they are referring to "General Weighted Average (GWA)"
- If a student asks something outside your knowledge, tell them you will escalate to a staff member

When a student wants to book an appointment:
1. Do NOT force the user to type exactly the transaction name. Intelligently map abbreviations (e.g., GWA, TOR, COE) to the full transaction names from the AVAILABLE TRANSACTION TYPES.
2. IMPORTANT: If the transaction is 'GWA' or 'General Weighted Average', you MUST ask the student for their GWA Request Details (Semester, Year Level, and School Year) before booking. Format this as 'GWA_REQUEST: [Semester] | [Year Level] | S.Y. [School Year]' and pass it to the book_appointment tool's 'notes' parameter.
3. IMPORTANT: If the transaction is 'COE', 'Certificate of Enrollment', 'TOR', 'Transcript of Records', or 'Diploma', you MUST ask the student for the 'Purpose of Request' before booking. Format this as 'PURPOSE: [User Purpose]' and pass it to the book_appointment tool's 'notes' parameter.
4. Ask for their preferred date (must be Monday to Saturday, at least 1 day in advance).
5. Call the check_availability tool to see open slots for that date. The slots will be returned in 12-hour AM/PM format (e.g. 01:00 PM). Present them clearly to the user.
6. Once they choose a date and time slot, call the book_appointment tool (pass the time slot as HH:MM in 24-hour format or whatever the user selected).
7. CRITICAL: NEVER tell the user an appointment is booked UNLESS you have successfully called the book_appointment tool and it returned a success message.

When a student wants to check their upcoming appointments:
1. Call the get_upcoming_appointments tool.

When a student wants to modify an appointment:
1. First, check if they have upcoming appointments using get_upcoming_appointments.
2. If they have one on a specific date, use check_availability for the new date they want.
3. Call the modify_appointment tool with the old date, new date, and new time slot.

When a student wants to cancel an appointment:
1. Ask them to confirm.
2. Call the cancel_appointment tool (note: they cannot cancel if the appointment is today or tomorrow).
Always be friendly, helpful, and concise. Respond in clean, plain text ONLY. DO NOT use any special characters, markdown formatting, asterisks, bullet points, or hash symbols in your responses."""


def get_or_create_session(student_id: str):
    admin = get_admin()
    try:
        res = admin.table("ai_chat_sessions") \
            .select("*") \
            .eq("student_id", student_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        if res.data:
            return res.data[0]
        new_session = admin.table("ai_chat_sessions").insert({
            "student_id": student_id,
            "messages": []
        }).execute()
        return new_session.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def save_messages(session_id: str, messages: list):
    admin = get_admin()
    try:
        admin.table("ai_chat_sessions") \
            .update({"messages": messages}) \
            .eq("id", session_id) \
            .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── M10: Message Auto-Categorization ─────────────────────────────────────────

def _categorize_message(question: str) -> dict:
    """
    Makes a quick AI call to tag the escalated message with
    priority (urgent/normal/fyi) and category (requirements/scheduling/process/complaint/other).
    Falls back to safe defaults if the call fails.
    """
    try:
        client = get_openai_client()
        resp = client.chat.completions.create(
            model=settings.openai_model,
            max_tokens=60,
            temperature=0,
            messages=[{
                "role": "user",
                "content": (
                    f"Classify this student message for a university registrar staff inbox.\n"
                    f"Message: \"{question}\"\n\n"
                    f"Reply with ONLY a JSON object, no extra text:\n"
                    f"{{\"priority\": \"urgent|normal|fyi\", "
                    f"\"category\": \"requirements|scheduling|process|complaint|other\"}}"
                )
            }]
        )
        raw   = resp.choices[0].message.content.strip()
        match = re.search(r'\{.*?\}', raw, re.DOTALL)
        if match:
            tags = json.loads(match.group())
            priority = tags.get("priority", "normal")
            category = tags.get("category", "other")
            # Validate values
            if priority not in ("urgent", "normal", "fyi"):
                priority = "normal"
            if category not in ("requirements", "scheduling", "process", "complaint", "other"):
                category = "other"
            return {"priority": priority, "category": category}
    except Exception:
        pass
    return {"priority": "normal", "category": "other"}


def escalate_to_staff(student_id: str, question: str):
    """
    Saves an AI-escalated student question to the messages table.
    Automatically tags priority + category via a second AI call (M10).
    """
    admin = get_admin()

    # ── M10: categorize before saving ────────────────────────────────────────
    tags = _categorize_message(question)
    priority = tags["priority"]
    category = tags["category"]

    try:
        admin.table("messages").insert({
            "student_id": student_id,
            "content":    question,          # raw student question
            "priority":   priority,          # urgent | normal | fyi
            "category":   category,          # requirements | scheduling | process | complaint | other
            "is_read":    False,
        }).execute()
        
        if priority == "urgent":
            # fetch student info to include name
            student_res = admin.table("users").select("first_name, last_name").eq("id", student_id).single().execute()
            if student_res.data:
                name = f"{student_res.data.get('first_name')} {student_res.data.get('last_name')}".strip()
                notify_staff_urgent_message(name)
            
    except Exception as e:
        pass  # escalation failure must never crash the chat


AI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "check_availability",
            "description": "Check available time slots for a specific date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "The date to check in YYYY-MM-DD format (must be Monday to Saturday)."
                    }
                },
                "required": ["date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book a new appointment for the student.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_name": {
                        "type": "string",
                        "description": "The exact name of the transaction type."
                    },
                    "date": {
                        "type": "string",
                        "description": "The date for the appointment in YYYY-MM-DD format."
                    },
                    "time_slot": {
                        "type": "string",
                        "description": "The time slot in HH:MM format (e.g. '09:00')."
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes for the appointment. MUST be used for GWA requests (e.g. 'GWA_REQUEST: 2nd Semester | 3rd Year | S.Y. 2024-2025') or COE/TOR/Diploma requests (e.g. 'PURPOSE: Scholarship Requirement')."
                    }
                },
                "required": ["transaction_name", "date", "time_slot"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_appointment",
            "description": "Cancel an upcoming appointment. Provide the appointment date and transaction name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_name": {
                        "type": "string",
                        "description": "The name of the transaction type to cancel."
                    },
                    "date": {
                        "type": "string",
                        "description": "The date of the appointment in YYYY-MM-DD format."
                    }
                },
                "required": ["transaction_name", "date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_upcoming_appointments",
            "description": "Get a list of the student's upcoming appointments.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "modify_appointment",
            "description": "Modify the date or time of an existing appointment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_name": {
                        "type": "string",
                        "description": "The name of the transaction type being modified."
                    },
                    "old_date": {
                        "type": "string",
                        "description": "The current date of the appointment in YYYY-MM-DD format."
                    },
                    "new_date": {
                        "type": "string",
                        "description": "The new date for the appointment in YYYY-MM-DD format."
                    },
                    "new_time_slot": {
                        "type": "string",
                        "description": "The new time slot in HH:MM format."
                    }
                },
                "required": ["transaction_name", "old_date", "new_date", "new_time_slot"]
            }
        }
    }
]

def execute_tool_call(tool_call, student_id: str):
    import json
    from datetime import date, datetime, timedelta
    from models.appointment_models import AppointmentCreate
    from services.appointment_service import get_available_slots_for_date, create_appointment, get_office_config, cancel_appointment as svc_cancel, reschedule_appointment as svc_reschedule
    
    admin = get_admin()
    name = tool_call.function.name
    try:
        args = json.loads(tool_call.function.arguments)
        if not isinstance(args, dict):
            args = {}
    except Exception:
        args = {}

    if name == "check_availability":
        try:
            date_str = args.get("date", "")
            if not date_str:
                return "Missing 'date' parameter."
            try:
                d = datetime.strptime(date_str, "%Y-%m-%d").date() if "-" in date_str else date.today()
            except Exception:
                try:
                    d = date.fromisoformat(date_str)
                except Exception:
                    return f"Invalid date format: {date_str}. Use YYYY-MM-DD."
            
            slots = get_available_slots_for_date(d)
            if not slots:
                return f"No slots available for {date_str}."
            
            # Convert to 12-hour AM/PM format for the AI to present
            formatted_slots = []
            for s in slots:
                try:
                    t_obj = datetime.strptime(s, "%H:%M")
                    formatted_slots.append(t_obj.strftime("%I:%M %p").lstrip("0"))
                except Exception:
                    formatted_slots.append(s)
                    
            return f"Available slots for {date_str}: " + ", ".join(formatted_slots)
        except Exception as e:
            return f"Error checking availability: {str(e)}"
            
    elif name == "book_appointment":
        try:
            txn_name = args.get("transaction_name", "")
            date_str = args.get("date", "")
            
            # convert time_slot back to 24h if AI passed 12h
            time_slot_raw = args.get("time_slot", "").strip()
            try:
                if "AM" in time_slot_raw.upper() or "PM" in time_slot_raw.upper():
                    time_slot = datetime.strptime(time_slot_raw.upper(), "%I:%M %p").strftime("%H:%M")
                else:
                    time_slot = datetime.strptime(time_slot_raw, "%H:%M").strftime("%H:%M")
            except Exception:
                time_slot = time_slot_raw
                
            if not txn_name or not date_str or not time_slot:
                return "Missing required parameters (transaction_name, date, time_slot)."
            
            tt_res = admin.table("transaction_types").select("id").ilike("name", f"%{txn_name}%").execute()
            if not tt_res.data:
                return f"Transaction type '{txn_name}' not found. Please match an available transaction type."
            
            # Fetch priority class for user
            u_res = admin.table("school_students").select("priority_class").eq("student_id", student_id).execute()
            p_class = u_res.data[0]["priority_class"] if u_res.data else "regular"
            
            try:
                appt_date = date.fromisoformat(date_str)
            except Exception:
                return f"Invalid date format: {date_str}. Use YYYY-MM-DD."
                
            notes_arg = args.get("notes", "")
            notes = notes_arg if notes_arg else "Booked via AI Assistant"
                
            appt_data = AppointmentCreate(
                transaction_type_id=tt_res.data[0]["id"],
                appointment_date=appt_date,
                time_slot=time_slot,
                notes=notes
            )
            res = create_appointment(student_id, p_class, appt_data)
            return f"Successfully booked appointment for {txn_name} on {date_str} at {time_slot}."
        except Exception as e:
            return f"Failed to book appointment: {str(e)}"
            
    elif name == "cancel_appointment":
        try:
            txn_name = args.get("transaction_name", "")
            date_str = args.get("date", "")
            if not txn_name or not date_str:
                return "Missing 'transaction_name' or 'date' parameters."
            try:
                appt_date = date.fromisoformat(date_str)
            except Exception:
                return f"Invalid date format: {date_str}. Use YYYY-MM-DD."
                
            tomorrow = date.today() + timedelta(days=1)
            if appt_date <= tomorrow:
                return "You cannot cancel an appointment if it is scheduled for today or tomorrow."
            
            tt_res = admin.table("transaction_types").select("id").ilike("name", f"%{txn_name}%").execute()
            if not tt_res.data:
                return f"Transaction type '{txn_name}' not found."
            tt_id = tt_res.data[0]["id"]

            # Find the appointment
            appt_res = admin.table("appointments").select("id").eq("student_id", student_id).eq("transaction_type_id", tt_id).eq("appointment_date", str(appt_date)).eq("status", "confirmed").execute()
            if not appt_res.data:
                return f"No confirmed appointment found for {txn_name} on {date_str}."
                
            appt_id = appt_res.data[0]["id"]
            svc_cancel(appointment_id=appt_id, student_id=student_id)
            
            # Update slots cache via config bump
            admin.table("office_config").update({"value": str(datetime.now().timestamp())}).eq("key", "last_slot_update").execute()
            
            return f"Successfully cancelled the appointment on {date_str}."
        except Exception as e:
            msg = getattr(e, "detail", str(e))
            return f"Failed to cancel appointment: {msg}"
            
    elif name == "get_upcoming_appointments":
        try:
            today_str = str(date.today())
            res = admin.table("appointments").select("*, transaction_types(name)").eq("student_id", student_id).eq("status", "confirmed").gte("appointment_date", today_str).execute()
            if not res.data:
                return "You have no upcoming appointments."
            appts = []
            for a in res.data:
                tt_name = a.get("transaction_types", {}).get("name", "Unknown")
                appts.append(f"{tt_name} on {a['appointment_date']} at {a['time_slot']}")
            return "Upcoming appointments:\n" + "\n".join(appts)
        except Exception as e:
            return f"Failed to get appointments: {str(e)}"
            
    elif name == "modify_appointment":
        try:
            txn_name = args.get("transaction_name", "")
            old_date_str = args.get("old_date", "")
            new_date_str = args.get("new_date", "")
            new_time_raw = args.get("new_time_slot", "").strip()
            
            if not txn_name or not old_date_str or not new_date_str or not new_time_raw:
                return "Missing parameters (transaction_name, old_date, new_date, new_time_slot)."
                
            try:
                if "AM" in new_time_raw.upper() or "PM" in new_time_raw.upper():
                    new_time = datetime.strptime(new_time_raw.upper(), "%I:%M %p").strftime("%H:%M")
                else:
                    new_time = datetime.strptime(new_time_raw, "%H:%M").strftime("%H:%M")
            except Exception:
                new_time = new_time_raw

            try:
                old_d = date.fromisoformat(old_date_str)
                new_d = date.fromisoformat(new_date_str)
            except Exception:
                return f"Invalid date format provided."
                
            tt_res = admin.table("transaction_types").select("id").ilike("name", f"%{txn_name}%").execute()
            if not tt_res.data:
                return f"Transaction type '{txn_name}' not found."
            tt_id = tt_res.data[0]["id"]
                
            # Find the appointment
            appt_res = admin.table("appointments").select("id, transaction_type_id").eq("student_id", student_id).eq("transaction_type_id", tt_id).eq("appointment_date", str(old_d)).eq("status", "confirmed").execute()
            if not appt_res.data:
                return f"No confirmed appointment found for {txn_name} on {old_date_str}."
                
            appt_id = appt_res.data[0]["id"]
            
            svc_reschedule(
                appointment_id=appt_id,
                new_date=str(new_d),
                new_time=new_time,
                actor_id=student_id,
                role="student",
                notes="Rescheduled via AI Assistant"
            )
            
            # Update slots cache via config bump
            admin.table("office_config").update({"value": str(datetime.now().timestamp())}).eq("key", "last_slot_update").execute()
            
            return f"Successfully modified the appointment to {new_date_str} at {new_time}."
        except Exception as e:
            msg = getattr(e, "detail", str(e))
            return f"Failed to modify appointment: {msg}"

    return "Unknown function."


def chat(student_id: str, user_message: str):
    client = get_openai_client()

    # Get or create session
    session    = get_or_create_session(student_id)
    session_id = session["id"]
    history    = session.get("messages") or []

    # Add user message to history
    history.append({"role": "user", "content": user_message})

    # Keep only last 12 messages to avoid token limits
    recent_history = history[-12:]

    # Build messages for API call
    messages = [
        {"role": "system", "content": get_system_prompt()}
    ] + recent_history

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            max_tokens=500,
            temperature=0.7,
            tools=AI_TOOLS,
            tool_choice="auto"
        )
        
        if getattr(response, "choices", None) is None:
            err_msg = getattr(response, "error", "Unknown API error")
            raise HTTPException(status_code=503, detail=f"AI service temporarily unavailable: {err_msg}")
            
        response_message = response.choices[0].message
        
        if response_message.tool_calls:
            messages.append(response_message)
            history.append(response_message.model_dump())
            for tool_call in response_message.tool_calls:
                function_response = execute_tool_call(tool_call, student_id)
                tool_msg = {
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": tool_call.function.name,
                    "content": function_response,
                }
                messages.append(tool_msg)
                history.append(tool_msg)
            # Second call to let the AI formulate a response based on the tool result
            second_response = client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                max_tokens=500,
                temperature=0.7,
                tools=AI_TOOLS,
                tool_choice="auto"
            )
            
            if getattr(second_response, "choices", None) is None:
                err_msg = getattr(second_response, "error", "Unknown API error")
                raise HTTPException(status_code=503, detail=f"AI service temporarily unavailable: {err_msg}")
                
            assistant_message = second_response.choices[0].message.content
        else:
            assistant_message = response_message.content

        if not assistant_message:
            assistant_message = "Done."

        # Check if escalation needed
        escalation_keywords = [
            "i don't know", "i'm not sure", "cannot answer",
            "please contact", "outside my knowledge", "escalate"
        ]
        should_escalate = any(kw in assistant_message.lower() for kw in escalation_keywords)

        if should_escalate:
            escalate_to_staff(student_id, user_message)  # ← M10 runs here
            assistant_message += "\n\n*Your question has been forwarded to a Registrar staff member who will follow up with you.*"

        # Save to history
        history.append({"role": "assistant", "content": assistant_message})
        save_messages(session_id, history[-12:])

        return {
            "message":    assistant_message,
            "session_id": session_id,
            "escalated":  should_escalate
        }

    except HTTPException:
        raise
    except openai.RateLimitError:
        raise HTTPException(status_code=429, detail="AI assistant is temporarily busy or rate-limited. Please try again in a few moments.")
    except openai.APIStatusError as e:
        if e.status_code == 429:
            raise HTTPException(status_code=429, detail="AI assistant is temporarily busy or rate-limited. Please try again in a few moments.")
        raise HTTPException(status_code=500, detail="AI service is temporarily unavailable. Please try again later.")
    except Exception as e:
        err_str = str(e)
        if "429" in err_str or "rate limit" in err_str.lower():
            raise HTTPException(status_code=429, detail="AI assistant is temporarily busy or rate-limited. Please try again in a few moments.")
        raise HTTPException(status_code=500, detail=f"AI error: {err_str}")


def clear_session(student_id: str):
    admin = get_admin()
    try:
        res = admin.table("ai_chat_sessions") \
            .select("id") \
            .eq("student_id", student_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        if res.data:
            admin.table("ai_chat_sessions") \
                .update({"messages": []}) \
                .eq("id", res.data[0]["id"]) \
                .execute()
        return {"message": "Chat cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))