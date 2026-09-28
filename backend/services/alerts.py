"""
Alerts Service - התראות (WhatsApp / Email)
מוכן לחיבור - ניתן להפעיל בשלב ב'
"""

import os
from models.database import Entry

WHATSAPP_ENABLED = os.getenv("WHATSAPP_ENABLED", "false").lower() == "true"
EMAIL_ENABLED    = os.getenv("EMAIL_ENABLED", "false").lower() == "true"


async def send_status_alert(entry: Entry, event: str):
    """
    שולח התראה לסדרנים כשמשהו קורה.
    event: 'collected' | 'urgent' | 'new'
    """
    messages = {
        "new":       f"📦 הכנה חדשה תועדה: {entry.city} - {entry.location_desc}",
        "collected": f"✅ נאסף: {entry.city} - {entry.location_desc} ע\"י {entry.collector_name}",
        "urgent":    f"⚠️ דחוף! לא נאסף מעל 24 שעות: {entry.city} - {entry.location_desc}",
    }
    msg = messages.get(event, "עדכון במערכת ConcreteTrack")

    if WHATSAPP_ENABLED:
        await _send_whatsapp(msg)
    if EMAIL_ENABLED:
        await _send_email(msg)


async def _send_whatsapp(msg: str):
    """
    WhatsApp Business API / Twilio
    להגדרה: הוסף WHATSAPP_TOKEN ו-WHATSAPP_PHONE ב-.env
    """
    import httpx
    token   = os.getenv("WHATSAPP_TOKEN", "")
    phone   = os.getenv("WHATSAPP_TO_PHONE", "")
    if not token or not phone:
        return
    # Twilio WhatsApp
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{os.getenv('TWILIO_SID')}/Messages.json",
            data={"From": f"whatsapp:{os.getenv('WHATSAPP_FROM')}", "To": f"whatsapp:{phone}", "Body": msg},
            auth=(os.getenv("TWILIO_SID", ""), os.getenv("TWILIO_TOKEN", ""))
        )


async def _send_email(msg: str):
    """
    SendGrid / SMTP
    """
    import smtplib
    from email.message import EmailMessage
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    to_email  = os.getenv("ALERT_EMAIL", "")
    if not all([smtp_host, smtp_user, smtp_pass, to_email]):
        return
    em = EmailMessage()
    em["Subject"] = "ConcreteTrack - עדכון"
    em["From"]    = smtp_user
    em["To"]      = to_email
    em.set_content(msg)
    with smtplib.SMTP_SSL(smtp_host, 465) as s:
        s.login(smtp_user, smtp_pass)
        s.send_message(em)
