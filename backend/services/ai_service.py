from openai import OpenAI
from fastapi import HTTPException
from config import get_settings
from datetime import date
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

OFFICE HOURS: {config.get('office_open_time', '08:00')} - {config.get('office_close_time', '17:00')}, Monday to Friday
SLOT DURATION: {config.get('slot_duration_minutes', '30')} minutes per slot
BOOKING CUTOFF: At least {config.get('booking_cutoff_days', '1')} day(s) in advance

TODAY'S DATE: {date.today().strftime('%B %d, %Y')} ({date.today().strftime('%A')})

IMPORTANT RULES:
- You can only book appointments on weekdays (Monday to Friday)
- Students must bring ALL required documents on their appointment date
- Appointments can be cancelled before the cutoff period
- If a student asks something outside your knowledge, tell them you will escalate to a staff member

When a student wants to book an appointment:
1. You MUST explicitly list out the exact transaction type names from the AVAILABLE TRANSACTION TYPES above and ask them to choose one exactly as written.
2. Ask for their preferred date (must be a weekday, at least 1 day in advance).
3. Call the check_availability tool to see open slots for that date, then present them to the user.
4. Once they choose an exact transaction name, date, and time slot, call the book_appointment tool.

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
                        "description": "The date to check in YYYY-MM-DD format (must be a weekday)."
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
            "description": "Cancel an upcoming appointment. Provide the appointment date to verify if it can be cancelled.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "The date of the appointment in YYYY-MM-DD format."
                    }
                },
                "required": ["date"]
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
                "required": ["old_date", "new_date", "new_time_slot"]
            }
        }
    }
]

def execute_tool_call(tool_call, student_id: str):
    import json
    from datetime import date, datetime, timedelta
    from models.appointment_models import AppointmentCreate
    from services.appointment_service import get_available_slots_for_date, create_appointment, get_office_config
    
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
            return f"Available slots for {date_str}: " + ", ".join(slots)
        except Exception as e:
            return f"Error checking availability: {str(e)}"
            
    elif name == "book_appointment":
        try:
            txn_name = args.get("transaction_name", "")
            date_str = args.get("date", "")
            time_slot = args.get("time_slot", "")
            if not txn_name or not date_str or not time_slot:
                return "Missing required parameters (transaction_name, date, time_slot)."
            
            tt_res = admin.table("transaction_types").select("id").eq("name", txn_name).execute()
            if not tt_res.data:
                return f"Transaction type '{txn_name}' not found. Please choose exactly from the list."
            
            # Fetch priority class for user
            u_res = admin.table("school_students").select("priority_class").eq("student_id", student_id).execute()
            p_class = u_res.data[0]["priority_class"] if u_res.data else "regular"
            
            try:
                appt_date = date.fromisoformat(date_str)
            except Exception:
                return f"Invalid date format: {date_str}. Use YYYY-MM-DD."
                
            appt_data = AppointmentCreate(
                transaction_type_id=tt_res.data[0]["id"],
                appointment_date=appt_date,
                time_slot=time_slot,
                notes="Booked via AI Assistant"
            )
            res = create_appointment(student_id, p_class, appt_data)
            return f"Successfully booked appointment for {txn_name} on {date_str} at {time_slot}."
        except Exception as e:
            return f"Failed to book appointment: {str(e)}"
            
    elif name == "cancel_appointment":
        try:
            date_str = args.get("date", "")
            if not date_str:
                return "Missing 'date' parameter."
            try:
                appt_date = date.fromisoformat(date_str)
            except Exception:
                return f"Invalid date format: {date_str}. Use YYYY-MM-DD."
                
            tomorrow = date.today() + timedelta(days=1)
            if appt_date <= tomorrow:
                return "You cannot cancel an appointment if it is scheduled for today or tomorrow."
            
            # Find the appointment
            appt_res = admin.table("appointments").select("id").eq("student_id", student_id).eq("appointment_date", str(appt_date)).eq("status", "confirmed").execute()
            if not appt_res.data:
                return f"No confirmed appointment found on {date_str}."
                
            admin.table("appointments").update({"status": "cancelled"}).eq("id", appt_res.data[0]["id"]).execute()
            
            # Update slots cache via config bump
            admin.table("office_config").update({"value": str(datetime.now().timestamp())}).eq("key", "last_slot_update").execute()
            
            return f"Successfully cancelled the appointment on {date_str}."
        except Exception as e:
            return f"Failed to cancel appointment: {str(e)}"
            
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
            old_date_str = args.get("old_date", "")
            new_date_str = args.get("new_date", "")
            new_time = args.get("new_time_slot", "")
            if not old_date_str or not new_date_str or not new_time:
                return "Missing parameters (old_date, new_date, new_time_slot)."

            try:
                old_d = date.fromisoformat(old_date_str)
                new_d = date.fromisoformat(new_date_str)
            except Exception:
                return f"Invalid date format provided."
                
            tomorrow = date.today() + timedelta(days=1)
            
            # Find the appointment
            appt_res = admin.table("appointments").select("id, transaction_type_id").eq("student_id", student_id).eq("appointment_date", str(old_d)).eq("status", "confirmed").execute()
            if not appt_res.data:
                return f"No confirmed appointment found on {old_date_str}."
                
            appt_id = appt_res.data[0]["id"]
            tt_id = appt_res.data[0]["transaction_type_id"]
            
            # Delete old (or we can just update, but let's check capacity)
            # Check slot capacity across ALL transaction types at that exact time
            num_windows = int(get_office_config().get("num_windows", 2))
            count_res = admin.table("appointments").select("id").eq("appointment_date", str(new_d)).eq("time_slot", new_time).neq("status", "cancelled").execute()
            if len(count_res.data) >= num_windows:
                return f"The time slot {new_time} on {new_date_str} is full."
                
            # Check student doesn't already have appointment same day same type (excluding this one)
            existing = admin.table("appointments").select("id").eq("student_id", student_id).eq("transaction_type_id", tt_id).eq("appointment_date", str(new_d)).neq("status", "cancelled").neq("id", appt_id).execute()
            if existing.data:
                return f"You already have an appointment for this transaction on {new_date_str}."
                
            admin.table("appointments").update({
                "appointment_date": str(new_d),
                "time_slot": new_time
            }).eq("id", appt_id).execute()
            
            # Update slots cache via config bump
            admin.table("office_config").update({"value": str(datetime.now().timestamp())}).eq("key", "last_slot_update").execute()
            
            return f"Successfully modified the appointment to {new_date_str} at {new_time}."
        except Exception as e:
            return f"Failed to modify appointment: {str(e)}"

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
        
        response_message = response.choices[0].message
        
        if response_message.tool_calls:
            messages.append(response_message)
            for tool_call in response_message.tool_calls:
                function_response = execute_tool_call(tool_call, student_id)
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": tool_call.function.name,
                    "content": function_response,
                })
            # Second call to let the AI formulate a response based on the tool result
            second_response = client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                max_tokens=500,
                temperature=0.7,
                tools=AI_TOOLS,
                tool_choice="auto"
            )
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

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


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