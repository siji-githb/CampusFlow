import openai
from openai import OpenAI
from fastapi import HTTPException
from config import get_settings
from datetime import date, datetime
import time
import json
import re
import logging
from deps import get_supabase_admin as get_admin

settings = get_settings()
logger = logging.getLogger(__name__)


# List of fallback Gemini Flash models to rotate through if primary fails.
# Explicitly excludes any 3.5 models (e.g. gemini-3.5-flash, gemini-3.5-flash-lite).
FALLBACK_FLASH_MODELS = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
]


def get_ai_providers():
    """
    Returns configured Google Gemini Flash AI providers in priority order:
    1. Google Gemini Primary Flash Model (e.g. gemini-3.6-flash or from config)
    2. Fallback Google Gemini Flash Models (excluding any 3.5 models)
    Note: OpenRouter fallback is disabled per configuration.
    """
    providers = []
    
    if not settings.gemini_api_key or not settings.gemini_api_key.strip():
        return providers

    gemini_client = OpenAI(
        api_key=settings.gemini_api_key.strip(),
        base_url=settings.gemini_base_url.strip() or "https://generativelanguage.googleapis.com/v1beta/openai/",
    )

    primary_model = (settings.gemini_model or "gemini-3.6-flash").strip()
    
    # 1. Primary Gemini Flash model
    providers.append({
        "name": f"Google Gemini ({primary_model}) [Primary]",
        "client": gemini_client,
        "model": primary_model,
    })

    # 2. Fallback Gemini Flash models (strictly excluding 3.5 and duplicates)
    for model_name in FALLBACK_FLASH_MODELS:
        if "3.5" in model_name:
            continue
        if model_name.lower() == primary_model.lower():
            continue
        
        providers.append({
            "name": f"Google Gemini ({model_name}) [Fallback]",
            "client": gemini_client,
            "model": model_name,
        })

    return providers


def get_openai_client():
    """Returns the primary active AI client."""
    providers = get_ai_providers()
    if providers:
        return providers[0]["client"]
    return OpenAI(
        api_key=settings.gemini_api_key.strip() if settings.gemini_api_key else "",
        base_url=settings.gemini_base_url.strip() or "https://generativelanguage.googleapis.com/v1beta/openai/",
    )


def clean_and_sanitize_response(text: str) -> str:
    """
    Strips raw markdown bolding and sanitizes any mentions of CRMC, Cebu Roosevelt,
    or CampusFlow Registrar, strictly keeping only "the Registrar's Office" or "the Registrar".
    """
    if not text:
        return ""
    cleaned = text.replace("**", "").replace("__", "")
    # Remove variants of CampusFlow Registrar and CampusFlow Registrar's Office
    cleaned = re.sub(r'\bCampusFlow\s+Registrar(?:\'s\s+Office)?\b', "the Registrar's Office", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bCampusFlow\s+Registrar\b', "the Registrar", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bCampusFlow\s+Assistant\b', "AI Assistant", cleaned, flags=re.IGNORECASE)
    # Remove variants of Cebu Roosevelt Memorial Colleges and CRMC
    cleaned = re.sub(r'\bCebu\s+Roosevelt\s+Memorial\s+Colleges\b', "the Registrar's Office", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bCebu\s+Roosevelt\b', "the Registrar", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bofficial\s+CRMC\s+options\b', "available options", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bCRMC\s+options\b', "available options", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bCRMC\s+Registrar(?:\'s\s+Office)?\b', "the Registrar's Office", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'\bCRMC\b', "the Registrar's Office", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


_prompt_cache = {"prompt": None, "timestamp": 0.0, "date": None}
CACHE_TTL = 300.0  # 5 minutes in seconds


def get_system_prompt():
    """Build the system prompt with current transaction types and office config (cached 5 min)."""
    global _prompt_cache
    now = time.time()
    today_date = date.today()

    if (
        _prompt_cache["prompt"] is not None
        and (now - _prompt_cache["timestamp"]) < CACHE_TTL
        and _prompt_cache["date"] == today_date
    ):
        return _prompt_cache["prompt"]

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

    prompt = f"""You are the AI Assistant for the Registrar's Office.

You help students with:
1. Booking, modifying, or cancelling registrar appointments
2. Answering questions about registrar transaction requirements, fees, and office procedures
3. Telling students what official documents they need to bring
4. Checking available appointment slots and tracking upcoming schedules

AVAILABLE TRANSACTION TYPES:{tt_info}

OFFICE HOURS: {open_time} - {close_time}, Monday to Saturday
SLOT DURATION: {config.get('slot_duration_minutes', '30')} minutes per slot
BOOKING CUTOFF: At least {config.get('booking_cutoff_days', '1')} day(s) in advance

TODAY'S DATE: {today_date.strftime('%B %d, %Y')} ({today_date.strftime('%A')})

STRICT INSTITUTION & OFFICE NAMING RULES (MANDATORY):
- Refer to the office ONLY as "the Registrar's Office" or "the Registrar".
- NEVER say "CampusFlow Registrar's Office", "CampusFlow Registrar", or "CampusFlow".
- NEVER say "CRMC", "Cebu Roosevelt", "Cebu Roosevelt Memorial Colleges", or "official CRMC options".
- Simply say "the Registrar's Office" or "available options".

STRICT SYSTEM SCOPE & CLARIFICATION RULES:
1. EXCLUSIVE REGISTRAR SCOPE: You are STRICTLY a school registrar and appointment assistant. You MUST NOT answer questions outside of registrar services, campus queue tracking, and appointment booking (for example: coding, math, general trivia, recipes, creative writing, non-school topics, or personal advice).
   - If a student asks any question outside of registrar procedures, politely decline with: "I can only assist with Registrar's Office services, document requirements, queue tracking, and appointment bookings. How can I help you with your registrar requests today?"
2. ASK FOR CLARIFICATION: If a student's request is vague, unclear, or lacks necessary details (e.g. they say "I need a document", "book me", or give an ambiguous date/subject), DO NOT guess. Politely ask clarifying questions to identify the specific transaction type, required details, or preferred date.
3. DAYS OF OPERATION: You can only book appointments from Monday to Saturday.
4. DOCUMENT REQUIREMENTS: Students must bring ALL required physical documents (e.g., Official Receipt) on their appointment date.
5. GWA MAPPING: If a student mentions "GWA", they are referring to "General Weighted Average (GWA)".
6. IN-PERSON REFERRAL: If a student inquires about complex, manual registrar disputes or issues requiring staff discretion, advise them to visit the Registrar's Office in person during office hours ({open_time} - {close_time}, Monday to Saturday).
7. PRIORITY LANES: The Registrar's Office strictly recognizes only three priority categories: PWD (Person with Disability), Pregnant, and Alumni (in addition to Regular). There is NO Senior Citizen category or lane.

When a student wants to book an appointment:
1. MULTI-DOCUMENT BOOKING: Students can book multiple documents in a single appointment visit (for example: TOR and COE together, or TOR + COE + Diploma).
   - Intelligently map abbreviations (e.g., GWA, TOR, COE, COR, Diploma) to the full transaction names from the AVAILABLE TRANSACTION TYPES.
2. STANDALONE COMPLETION FORMS (MANDATORY RULE):
   - "Completion Form - Request" and "Completion Form - Submission" are fast-track counter services and CANNOT be combined with other documents in the same appointment.
   - If a student asks to book a Completion Form alongside any other document, politely explain: "Completion Forms are quick counter services and must be scheduled separately on their own. Which appointment would you like to schedule first?"
3. DYNAMIC REQUIREMENTS COLLECTION:
   - GWA / Academic Info: If ANY requested document is "General Weighted Average (GWA)" (or requires academic details), you MUST ask for:
     • Semester (1st Semester, 2nd Semester, Summer)
     • Year Level (1st Year, 2nd Year, 3rd Year, 4th Year)
     • School Year (e.g. 2025-2026)
     Format this as: "ACADEMIC INFO: Sem: [Semester] | Yr: [Year Level] | S.Y.: [School Year]" in the appointment notes.
   - Purpose of Request: If ANY requested document is a certificate or record (TOR, COE, COR, Diploma), you MUST ask for the Purpose of Request based on the available options:
     • Employment
     • Scholarship
     • Board Exam Application
     • Other (please specify)
     Format this as: "PURPOSE: [User Purpose]" in the appointment notes. If both academic info and purpose are collected, combine them (e.g. "ACADEMIC INFO: ...\n\nPURPOSE: ...").
4. COMBINED PHYSICAL REQUIREMENTS:
   - When answering what documents to bring or confirming a multi-document booking, list the combined, deduplicated requirements from all selected transactions.
5. PREFERRED DATE & TIME SLOTS:
   - Ask for their preferred date (must be Monday to Saturday, at least 1 day in advance).
   - Call the check_availability tool to see open slots for that date. The slots will be returned in 12-hour AM/PM format (e.g. 01:00 PM). Present them clearly using clean bullet points.
6. CALLING THE BOOKING TOOL:
   - Once they choose a date and time slot, call the book_appointment tool passing:
     • transaction_names: an array containing the exact names of all requested documents (e.g. ["Transcript of Records (TOR)", "Certificate of Enrollment (COE)"])
     • date: YYYY-MM-DD
     • time_slot: HH:MM in 24-hour format
     • notes: combined academic info and/or purpose
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

RESPONSE STRUCTURE & READABILITY RULES (MANDATORY):
- High Scannability: Keep your answers clean, well-spaced, and effortless to scan. NEVER output large walls of unbroken text.
- Short Paragraphs: Keep narrative paragraphs short (1 to 2 sentences max). Always insert an empty line between paragraphs.
- Bullet Lists: Whenever presenting multiple items (such as transaction types, required documents, purpose options, or open time slots), ALWAYS format them as bullet points using "• ", each on its own separate line.
- Example for listing transaction options:
  Which transaction would you like to schedule?
  • Transcript of Records (TOR)
  • Certificate of Enrollment (COE)
  • Certificate of Registration (COR)
  • General Weighted Average (GWA)
  • Diploma Release
  • Completion Form
- Example for asking purpose of request:
  For your Transcript of Records (TOR) request, what is the purpose of your request?

  Please choose from the available options:
  • Employment
  • Scholarship
  • Board Exam Application
  • Other (please specify)
- Example for presenting open time slots:
  Here are the available time slots for [Date]:
  • 09:00 AM
  • 10:30 AM
  • 01:00 PM
  • 02:30 PM
- Example for listing requirements:
  To claim your Transcript of Records (TOR), please bring:
  • Official Receipt of Payment
  • Valid Student or Government ID
- Call-to-Action: Always place the closing question or next step on its own separate line at the very bottom.
- DO NOT use markdown bolding (NEVER use ** or __). Keep the text clean and natural.
- Never leave a response unfinished or mid-sentence."""

    _prompt_cache = {"prompt": prompt, "timestamp": now, "date": today_date}
    return prompt


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
            "description": "Book a new appointment for the student for one or multiple documents simultaneously.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of exact names of the transaction types/documents to book together in a single appointment (e.g. ['Transcript of Records (TOR)', 'Certificate of Enrollment (COE)']). Multiple documents can be booked together in the same appointment slot, EXCEPT for Completion Forms which must be booked alone."
                    },
                    "transaction_name": {
                        "type": "string",
                        "description": "Optional single transaction type name (used if booking only one document)."
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
                        "description": "Optional notes for the appointment. MUST include ACADEMIC INFO for GWA requests (e.g. 'ACADEMIC INFO: Sem: 2nd Semester | Yr: 3rd Year | S.Y.: 2024-2025') and/or PURPOSE for certificate requests (e.g. 'PURPOSE: Scholarship Requirement')."
                    }
                },
                "required": ["date", "time_slot"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_appointment",
            "description": "Cancel an upcoming appointment. Provide the appointment date and optionally the transaction name to cancel.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_name": {
                        "type": "string",
                        "description": "The name of the transaction type to cancel, or leave empty/'all' to cancel all documents in the visit on that date."
                    },
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


TOOL_STATUS_MESSAGES = {
    "check_availability": "Checking available appointment slots...",
    "get_upcoming_appointments": "Retrieving your upcoming appointments...",
    "book_appointment": "Booking your registrar appointment...",
    "modify_appointment": "Updating your appointment schedule...",
    "cancel_appointment": "Processing appointment cancellation...",
}


class AssembledFunction:
    def __init__(self, name: str, arguments: str):
        self.name = name
        self.arguments = arguments


class AssembledToolCall:
    def __init__(self, tc_id: str, name: str, arguments: str, extra_content: dict = None):
        self.id = tc_id
        self.type = "function"
        self.function = AssembledFunction(name, arguments)
        self.extra_content = extra_content


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
            # Handle both transaction_names (list) and transaction_name (single)
            raw_names = args.get("transaction_names")
            if not raw_names:
                single_name = args.get("transaction_name", "")
                if single_name:
                    raw_names = [single_name]
                else:
                    raw_names = []
            elif isinstance(raw_names, str):
                raw_names = [raw_names]

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
                
            if not raw_names or not date_str or not time_slot:
                return "Missing required parameters (transaction_names, date, time_slot)."

            # Fetch active transaction types for fuzzy / abbreviation matching
            all_tts_res = admin.table("transaction_types").select("*").eq("is_active", True).execute()
            active_tts = all_tts_res.data or []

            matched_tts = []
            unmatched = []

            def match_type(term: str):
                t_lower = term.lower().strip()
                if not t_lower:
                    return None
                t_norm = re.sub(r'\s+', ' ', t_lower)
                t_compact = re.sub(r'\s*\(\s*', '(', t_norm).replace(')', '')
                
                if 'transcript' in t_lower or t_lower == 'tor':
                    return next((t for t in active_tts if 'transcript' in t['name'].lower()), None)
                if 'enrollment' in t_lower or t_lower == 'coe':
                    return next((t for t in active_tts if 'enrollment' in t['name'].lower()), None)
                if 'registration' in t_lower or t_lower == 'cor':
                    return next((t for t in active_tts if 'registration' in t['name'].lower()), None)
                if 'weighted' in t_lower or 'gwa' in t_lower:
                    return next((t for t in active_tts if 'weighted' in t['name'].lower() or 'gwa' in t['name'].lower()), None)
                if 'diploma' in t_lower:
                    return next((t for t in active_tts if 'diploma' in t['name'].lower()), None)
                if 'completion' in t_lower and 'submission' in t_lower:
                    return next((t for t in active_tts if 'completion' in t['name'].lower() and 'submission' in t['name'].lower()), None)
                if 'completion' in t_lower and ('request' in t_lower or 'form' in t_lower):
                    return next((t for t in active_tts if 'completion' in t['name'].lower() and 'request' in t['name'].lower()), None)

                for t in active_tts:
                    t_name_lower = t['name'].lower()
                    t_name_compact = re.sub(r'\s*\(\s*', '(', t_name_lower).replace(')', '')
                    if t_norm in t_name_lower or t_name_lower in t_norm or t_compact in t_name_compact or t_name_compact in t_compact:
                        return t
                return None

            for req_name in raw_names:
                parts = re.split(r'\s*(?:,|&|\band\b)\s*', req_name, flags=re.IGNORECASE) if isinstance(req_name, str) else [str(req_name)]
                for p in parts:
                    clean_p = p.strip()
                    if not clean_p:
                        continue
                    m = match_type(clean_p)
                    if m:
                        if m["id"] not in [t["id"] for t in matched_tts]:
                            matched_tts.append(m)
                    else:
                        unmatched.append(clean_p)

            if not matched_tts:
                avail_names = ", ".join([t["name"] for t in active_tts])
                return f"Could not match requested document(s): {', '.join(raw_names)}. Available transaction types are: {avail_names}."

            if unmatched:
                return f"Could not find document(s): {', '.join(unmatched)}. Matched: {', '.join([t['name'] for t in matched_tts])}. Please clarify the document name."

            # Standalone completion form rule
            if len(matched_tts) > 1:
                has_completion = any("completion form" in t["name"].lower() for t in matched_tts)
                if has_completion:
                    return "Completion Forms are quick counter services and cannot be combined with other document requests in the same appointment. Please book Completion Form separately."

            # Fetch priority class for user (syncing any verified priority status)
            try:
                from services.priority_service import sync_priority_status
                sync_priority_status(student_id)
            except Exception:
                pass

            u_res = admin.table("users").select("priority_class").eq("id", student_id).execute()
            p_class = u_res.data[0]["priority_class"] if u_res.data and u_res.data[0].get("priority_class") else "regular"
            
            try:
                appt_date = date.fromisoformat(date_str)
            except Exception:
                return f"Invalid date format: {date_str}. Use YYYY-MM-DD."
                
            notes_arg = args.get("notes", "")
            notes = notes_arg if notes_arg else "Booked via AI Assistant"
                
            appt_data = AppointmentCreate(
                transaction_type_ids=[t["id"] for t in matched_tts],
                transaction_type_id=matched_tts[0]["id"],
                appointment_date=appt_date,
                time_slot=time_slot,
                notes=notes
            )
            create_appointment(student_id, p_class, appt_data)
            
            # Format time to 12h
            try:
                slot_12h = datetime.strptime(time_slot, "%H:%M").strftime("%I:%M %p").lstrip("0")
            except Exception:
                slot_12h = time_slot
                
            doc_titles = ", ".join([t["name"] for t in matched_tts])
            return f"Successfully booked appointment for {doc_titles} on {date_str} at {slot_12h}."
        except Exception as e:
            msg = getattr(e, "detail", str(e))
            return f"Failed to book appointment: {msg}"
            
    elif name == "cancel_appointment":
        try:
            txn_name = args.get("transaction_name", "")
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
            
            query = admin.table("appointments").select("id, transaction_type_id, transaction_types(name)").eq("student_id", student_id).eq("appointment_date", str(appt_date)).eq("status", "confirmed")
            
            if txn_name and txn_name.lower() not in ("all", "visit", "any"):
                all_tts = admin.table("transaction_types").select("id, name").execute().data or []
                match_id = None
                for t in all_tts:
                    if txn_name.lower() in t["name"].lower():
                        match_id = t["id"]
                        break
                if match_id:
                    query = query.eq("transaction_type_id", match_id)

            appts_res = query.execute()
            if not appts_res.data:
                return f"No confirmed appointment found for {txn_name or 'the scheduled visit'} on {date_str}."
                
            for a in appts_res.data:
                svc_cancel(appointment_id=a["id"], student_id=student_id)
            
            # Update slots cache via config bump
            admin.table("office_config").update({"value": str(datetime.now().timestamp())}).eq("key", "last_slot_update").execute()
            
            cancelled_names = ", ".join([a.get("transaction_types", {}).get("name", "Document") for a in appts_res.data])
            return f"Successfully cancelled appointment ({cancelled_names}) on {date_str}."
        except Exception as e:
            msg = getattr(e, "detail", str(e))
            return f"Failed to cancel appointment: {msg}"
            
    elif name == "get_upcoming_appointments":
        try:
            today_str = str(date.today())
            res = admin.table("appointments").select("*, transaction_types(name)").eq("student_id", student_id).eq("status", "confirmed").gte("appointment_date", today_str).order("appointment_date").order("time_slot").execute()
            if not res.data:
                return "You have no upcoming appointments."
            
            # Group sibling appointments by (appointment_date, time_slot)
            visits = {}
            for a in res.data:
                key = (a['appointment_date'], a['time_slot'])
                tt_name = a.get("transaction_types", {}).get("name", "Document")
                if key not in visits:
                    visits[key] = []
                visits[key].append(tt_name)
                
            appts = []
            for (d, slot), doc_names in visits.items():
                docs_str = ", ".join(doc_names)
                try:
                    slot_12h = datetime.strptime(slot, "%H:%M").strftime("%I:%M %p").lstrip("0")
                except Exception:
                    slot_12h = slot
                appts.append(f"• {docs_str} on {d} at {slot_12h}")
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
            detail="AI service is not configured. Please configure GEMINI_API_KEY in backend/.env"
        )

    # Get or create session
    session    = get_or_create_session(student_id)
    session_id = session["id"]
    history    = session.get("messages") or []

    # Clean history: only conversational messages (user/assistant with valid text content)
    clean_history = [
        {"role": m["role"], "content": clean_and_sanitize_response(m["content"])}
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
                    max_tokens=1000,
                    temperature=0.3,
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
                assistant_message = clean_and_sanitize_response(assistant_message)

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


def chat_stream(student_id: str, user_message: str):
    """
    Server-Sent Events (SSE) streaming generator for real-time word-by-word responses.
    Emits JSON events:
    - {'type': 'status', 'content': '...'} (tool progress)
    - {'type': 'delta', 'content': '...'} (token chunks)
    - {'type': 'done', 'session_id': '...'}
    - {'type': 'error', 'content': '...'}
    """
    providers = get_ai_providers()
    if not providers:
        yield f"data: {json.dumps({'type': 'error', 'content': 'AI service is not configured. Please configure GEMINI_API_KEY in backend/.env'})}\n\n"
        return

    try:
        session = get_or_create_session(student_id)
        session_id = session["id"]
        history = session.get("messages") or []
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': f'Session error: {str(e)}'})}\n\n"
        return

    clean_history = [
        {"role": m["role"], "content": clean_and_sanitize_response(m["content"])}
        for m in history
        if isinstance(m, dict) and m.get("role") in ("user", "assistant") and m.get("content")
    ]
    recent_history = clean_history[-10:]

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
            completed_successfully = False

            for loop_idx in range(5):
                stream = client.chat.completions.create(
                    model=model,
                    messages=current_messages,
                    max_tokens=1000,
                    temperature=0.3,
                    tools=AI_TOOLS,
                    tool_choice="auto",
                    stream=True,
                )

                tool_calls_dict = {}
                content_chunks = []

                for chunk in stream:
                    choice = chunk.choices[0] if chunk.choices else None
                    if not choice or not choice.delta:
                        continue
                    delta = choice.delta

                    if delta.tool_calls:
                        for tc in delta.tool_calls:
                            tc_idx = tc.index if tc.index is not None else 0
                            extra = getattr(tc, "extra_content", None)
                            if tc_idx not in tool_calls_dict:
                                tool_calls_dict[tc_idx] = {
                                    "id": tc.id or f"call_{tc_idx}",
                                    "name": tc.function.name if tc.function and tc.function.name else "",
                                    "arguments": tc.function.arguments if tc.function and tc.function.arguments else "",
                                    "extra_content": extra,
                                }
                            else:
                                if tc.id:
                                    tool_calls_dict[tc_idx]["id"] = tc.id
                                if extra:
                                    tool_calls_dict[tc_idx]["extra_content"] = extra
                                if tc.function:
                                    if tc.function.name:
                                        tool_calls_dict[tc_idx]["name"] += tc.function.name
                                    if tc.function.arguments:
                                        tool_calls_dict[tc_idx]["arguments"] += tc.function.arguments

                    if delta.content:
                        content_chunks.append(delta.content)
                        yield f"data: {json.dumps({'type': 'delta', 'content': delta.content})}\n\n"

                if tool_calls_dict:
                    assembled = [
                        AssembledToolCall(
                            tool_calls_dict[k]["id"],
                            tool_calls_dict[k]["name"],
                            tool_calls_dict[k]["arguments"],
                            tool_calls_dict[k].get("extra_content"),
                        )
                        for k in sorted(tool_calls_dict.keys())
                    ]

                    tool_call_payloads = []
                    for tc in assembled:
                        payload = {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        if tc.extra_content:
                            payload["extra_content"] = tc.extra_content
                        tool_call_payloads.append(payload)

                    current_messages.append({
                        "role": "assistant",
                        "content": "".join(content_chunks) or None,
                        "tool_calls": tool_call_payloads,
                    })

                    for tc in assembled:
                        fn_name = tc.function.name
                        status_msg = TOOL_STATUS_MESSAGES.get(fn_name, f"Processing {fn_name.replace('_', ' ')}...")
                        yield f"data: {json.dumps({'type': 'status', 'content': status_msg})}\n\n"

                        function_response = execute_tool_call(tc, student_id)
                        current_messages.append({
                            "tool_call_id": tc.id,
                            "role": "tool",
                            "name": fn_name,
                            "content": function_response
                        })
                else:
                    assistant_message = "".join(content_chunks)
                    completed_successfully = True
                    break

            if not completed_successfully and not assistant_message:
                assistant_message = "I have processed your request. Please check your appointments or queue for the latest status."
                yield f"data: {json.dumps({'type': 'delta', 'content': assistant_message})}\n\n"

            clean_assistant = clean_and_sanitize_response(assistant_message)

            # Save clean user & assistant exchange to history
            history.append({"role": "user", "content": user_message})
            history.append({"role": "assistant", "content": clean_assistant})
            save_messages(session_id, history[-12:])

            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"
            return

        except Exception as e:
            last_exception = e
            logger.warning(f"AI Streaming Provider '{p_name}' failed with error: {e}. Attempting next provider...")
            continue

    # All providers failed
    err_str = str(last_exception)
    if "429" in err_str or "rate limit" in err_str.lower() or "quota" in err_str.lower():
        msg = "AI assistant is temporarily busy or rate-limited. Please try again in a few moments."
    else:
        msg = "AI service temporarily unavailable. Please try again."
    yield f"data: {json.dumps({'type': 'error', 'content': msg})}\n\n"


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