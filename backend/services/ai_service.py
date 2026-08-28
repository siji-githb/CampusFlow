import openai
from openai import OpenAI
from fastapi import HTTPException
from config import get_settings
from datetime import date, datetime
import json
import re
import logging
from deps import get_supabase_admin as get_admin

settings = get_settings()
logger = logging.getLogger(__name__)


def get_ai_providers():
    """
    Returns configured AI providers in priority order:
    1. Google Gemini (Primary via Google AI Studio)
    2. OpenRouter / OpenAI (Fallback)
    """
    providers = []
    
    # 1. Primary: Google Gemini via Google AI Studio OpenAI-compatible endpoint
    if settings.gemini_api_key and settings.gemini_api_key.strip():
        providers.append({
            "name": "Google Gemini (Primary)",
            "client": OpenAI(
                api_key=settings.gemini_api_key.strip(),
                base_url=settings.gemini_base_url.strip() or "https://generativelanguage.googleapis.com/v1beta/openai/",
            ),
            "model": settings.gemini_model.strip() or "gemini-3.6-flash",
        })

    # 2. Fallback: OpenRouter
    if settings.fallback_api_key and settings.fallback_api_key.strip() and settings.fallback_api_key != "placeholder":
        providers.append({
            "name": "OpenRouter (Fallback)",
            "client": OpenAI(
                api_key=settings.fallback_api_key.strip(),
                base_url=settings.fallback_base_url.strip(),
            ),
            "model": settings.fallback_model.strip(),
        })

    return providers


def get_openai_client():
    """Returns the primary active AI client for backward compatibility."""
    providers = get_ai_providers()
    if providers:
        return providers[0]["client"]
    return OpenAI(
        api_key=settings.fallback_api_key,
        base_url=settings.fallback_base_url,
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

    return f"""You are CampusFlow Assistant, an AI scheduling helper dedicated exclusively to the Registrar's Office of Cebu Roosevelt Memorial Colleges (CRMC).

You help students with:
1. Booking, modifying, or cancelling registrar appointments
2. Answering questions about registrar transaction requirements, fees, and office procedures
3. Telling students what official documents they need to bring
4. Checking available appointment slots and tracking upcoming schedules

AVAILABLE TRANSACTION TYPES:{tt_info}

OFFICE HOURS: {open_time} - {close_time}, Monday to Saturday
SLOT DURATION: {config.get('slot_duration_minutes', '30')} minutes per slot
BOOKING CUTOFF: At least {config.get('booking_cutoff_days', '1')} day(s) in advance

TODAY'S DATE: {date.today().strftime('%B %d, %Y')} ({date.today().strftime('%A')})

STRICT SYSTEM SCOPE & CLARIFICATION RULES:
1. EXCLUSIVE REGISTRAR SCOPE: You are STRICTLY a school registrar and appointment assistant. You MUST NOT answer questions outside of CRMC registrar services, campus queue tracking, and appointment booking (for example: coding, math, general trivia, recipes, creative writing, non-school topics, or personal advice).
   - If a student asks any question outside of registrar procedures, politely decline with: "I can only assist with CRMC Registrar services, document requirements, queue tracking, and appointment bookings. How can I help you with your registrar requests today?"
2. ASK FOR CLARIFICATION: If a student's request is vague, unclear, or lacks necessary details (e.g. they say "I need a document", "book me", or give an ambiguous date/subject), DO NOT guess. Politely ask clarifying questions to identify the specific transaction type, required details, or preferred date.
3. DAYS OF OPERATION: You can only book appointments from Monday to Saturday.
4. DOCUMENT REQUIREMENTS: Students must bring ALL required physical documents (e.g., Official Receipt) on their appointment date.
5. GWA MAPPING: If a student mentions "GWA", they are referring to "General Weighted Average (GWA)".
6. IN-PERSON REFERRAL: If a student inquires about complex, manual registrar disputes or issues requiring staff discretion, advise them to visit the Registrar's Office in person during office hours ({open_time} - {close_time}, Monday to Saturday).

When a student wants to book an appointment:
1. Do NOT force the user to type exactly the transaction name. Intelligently map abbreviations (e.g., GWA, TOR, COE) to the full transaction names from the AVAILABLE TRANSACTION TYPES.
2. IMPORTANT: If the transaction is 'GWA' or 'General Weighted Average', you MUST ask the student for their GWA Request Details (Semester: 1st Semester, 2nd Semester, Summer; Year Level: 1st Year to 4th Year; and School Year e.g. 2025-2026) before booking. Format this as 'GWA_REQUEST: [Semester] | [Year Level] | S.Y. [School Year]' and pass it to the book_appointment tool's 'notes' parameter.
3. IMPORTANT: If the transaction is 'COE', 'Certificate of Enrollment', 'TOR', 'Transcript of Records', 'Diploma', or any document request, you MUST ask the student for their 'Purpose of Request' based on the official CRMC options:
   - Employment
   - Scholarship
   - Board Exam Application
   - Other (please specify)
   Format this as 'PURPOSE: [User Purpose]' and pass it to the book_appointment tool's 'notes' parameter.
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

FORMATTING RULES:
- DO NOT use markdown bolding (NEVER use ** or __).
- Keep responses clean, complete, friendly, and easy to read using standard natural language and punctuation. Never stop mid-sentence."""


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
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Optional maximum number of upcoming appointments to fetch (default: 5)."
                    }
                }
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
    providers = get_ai_providers()
    if not providers:
        raise HTTPException(
            status_code=503, 
            detail="AI service is not configured. Please configure GEMINI_API_KEY or OPENROUTER_API_KEY in backend/.env"
        )

    # Get or create session
    session    = get_or_create_session(student_id)
    session_id = session["id"]
    history    = session.get("messages") or []

    # Clean history: only conversational messages (user/assistant with valid text content)
    clean_history = [
        {"role": m["role"], "content": m["content"]}
        for m in history
        if isinstance(m, dict) and m.get("role") in ("user", "assistant") and m.get("content")
    ]

    # Keep only last 10 messages to maintain clean token budgets
    recent_history = clean_history[-10:]

    # Base payload for API call
    base_messages = [
        {"role": "system", "content": get_system_prompt()}
    ] + recent_history + [{"role": "user", "content": user_message}]

    last_exception = None

    for idx, provider in enumerate(providers):
        client = provider["client"]
        model = provider["model"]
        p_name = provider["name"]
        
        try:
            current_messages = list(base_messages)
            assistant_message = ""

            for loop_idx in range(5):
                response = client.chat.completions.create(
                    model=model,
                    messages=current_messages,
                    max_tokens=2000,
                    temperature=0.7,
                    tools=AI_TOOLS,
                    tool_choice="auto"
                )
                
                if getattr(response, "choices", None) is None or not response.choices:
                    err_msg = getattr(response, "error", "Unknown API error")
                    raise RuntimeError(f"Provider {p_name} returned no choices: {err_msg}")
                    
                response_message = response.choices[0].message
                
                if response_message.tool_calls:
                    current_messages.append(response_message)
                    for tool_call in response_message.tool_calls:
                        function_response = execute_tool_call(tool_call, student_id)
                        tool_msg = {
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": tool_call.function.name,
                            "content": function_response,
                        }
                        current_messages.append(tool_msg)
                else:
                    assistant_message = response_message.content or ""
                    break

            if not assistant_message:
                assistant_message = "I have processed your request. Please check your appointments or queue for the latest status."
            else:
                assistant_message = assistant_message.replace("**", "").replace("__", "").strip()

            # Save clean user & assistant exchange to history
            history.append({"role": "user", "content": user_message})
            history.append({"role": "assistant", "content": assistant_message})
            save_messages(session_id, history[-12:])

            return {
                "message":    assistant_message,
                "session_id": session_id
            }

        except Exception as e:
            last_exception = e
            logger.warning(f"AI Provider '{p_name}' failed with error: {e}. Attempting next provider...")
            continue

    # If all configured providers failed:
    err_str = str(last_exception)
    if "429" in err_str or "rate limit" in err_str.lower() or "quota" in err_str.lower():
        raise HTTPException(
            status_code=429, 
            detail="AI assistant is temporarily busy or rate-limited. Please try again in a few moments."
        )
    raise HTTPException(
        status_code=500, 
        detail=f"AI service temporarily unavailable: {err_str}"
    )


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