import json
import subprocess
import uuid
from datetime import datetime

def run_db(sql):
    """Executes a SQL statement via team-db CLI."""
    result = subprocess.run(['team-db', sql], capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"Database error: {result.stderr}")
    return json.loads(result.stdout)

# Business CRUD
def create_business(name, industry=None, settings=None):
    business_id = str(uuid.uuid4())
    settings_json = json.dumps(settings) if settings else "{}"
    run_db(f"INSERT INTO businesses (id, name, industry, settings) VALUES ('{business_id}', '{name}', '{industry}', '{settings_json}')")
    return business_id

def get_business(business_id):
    res = run_db(f"SELECT * FROM businesses WHERE id = '{business_id}'")
    return res[0] if res else None

# Lead CRUD
def create_lead(business_id, name=None, service_needed=None, contact_info=None):
    lead_id = str(uuid.uuid4())
    name_val = f"'{name}'" if name else "NULL"
    service_val = f"'{service_needed}'" if service_needed else "NULL"
    contact_val = f"'{contact_info}'" if contact_info else "NULL"
    run_db(f"INSERT INTO leads (id, business_id, name, service_needed, contact_info) VALUES ('{lead_id}', '{business_id}', {name_val}, {service_val}, {contact_val})")
    return lead_id

def update_lead_status(lead_id, status):
    run_db(f"UPDATE leads SET status = '{status}' WHERE id = '{lead_id}'")

# Conversation CRUD
def create_conversation(business_id, lead_id=None):
    conv_id = str(uuid.uuid4())
    lead_val = f"'{lead_id}'" if lead_id else "NULL"
    run_db(f"INSERT INTO conversations (id, business_id, lead_id) VALUES ('{conv_id}', '{business_id}', {lead_val})")
    return conv_id

def add_message(conversation_id, role, content):
    msg_id = str(uuid.uuid4())
    # Escape single quotes in content
    safe_content = content.replace("'", "''")
    run_db(f"INSERT INTO messages (id, conversation_id, role, content) VALUES ('{msg_id}', '{conversation_id}', '{role}', '{safe_content}')")
    run_db(f"UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = '{conversation_id}'")
    return msg_id

def get_messages(conversation_id):
    return run_db(f"SELECT * FROM messages WHERE conversation_id = '{conversation_id}' ORDER BY created_at ASC")

# Booking CRUD
def create_booking(business_id, lead_id, service, appointment_at):
    booking_id = str(uuid.uuid4())
    run_db(f"INSERT INTO bookings (id, business_id, lead_id, service, appointment_at) VALUES ('{booking_id}', '{business_id}', '{lead_id}', '{service}', '{appointment_at}')")
    return booking_id
