"""
WhatsApp Alerts - Twilio WhatsApp Business API
שולח הודעה לסדרנים על אירועים במערכת

הגדרה:
1. צור חשבון Twilio: https://www.twilio.com
2. הפעל WhatsApp Sandbox (או Business number)
3. מלא את המשתנים ב-.env
"""

import os
import httpx
from models.database import Entry

TWILIO_SID    = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN", "")
FROM_NUMBER   = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")  # Sandbox
# מספרים של הסדרנים - מופרדים בפסיק
ADMIN_PHONES  = os.getenv("ADMIN_WHATSAPP_PHONES", "").split(",")

ENABLED = bool(TWILIO_SID and TWILIO_TOKEN and ADMIN_PHONES[0])


REGION_HE = {"north": "צפון", "center": "מרכז", "south": "דרום"}

TEMPLATES = {
    "new": (
        "🏗️ *ConcreteTrack - הכנה חדשה*\n\n"
        "📍 {city} - {location}\n"
        "🗺️ אזור: {region}\n"
        "👷 בודק: {inspector}\n"
        "🕐 {time}\n\n"
        "{maps_link}"
    ),
    "urgent": (
        "⚠️ *ConcreteTrack - דחוף! לא נאסף*\n\n"
        "📍 {city} - {location}\n"
        "🗺️ אזור: {region}\n"
        "⏳ מעל 24 שעות בשטח!\n\n"
        "{maps_link}"
    ),
    "collected": (
        "✅ *ConcreteTrack - נאסף*\n\n"
        "📍 {city} - {location}\n"
        "🗺️ אזור: {region}\n"
        "✍️ נאסף ע\"י: {collector}"
    ),
    "cancelled": (
        "❌ *ConcreteTrack - בוטל*\n\n"
        "📍 {city} - {location}\n"
        "🗺️ אזור: {region}"
    ),
}


def _maps_link(lat, lng) -> str:
    if lat and lng:
        return f"🗺️ https://maps.google.com/?q={lat},{lng}"
    return ""


def _build_message(event: str, entry: Entry, extra: dict = None) -> str:
    extra = extra or {}
    region_he = REGION_HE.get(entry.region.value if hasattr(entry.region, 'value') else entry.region, "")
    params = {
        "city":      entry.city,
        "location":  entry.location_desc,
        "region":    region_he,
        "inspector": getattr(entry, "inspector_name", ""),
        "collector": extra.get("collector_name", ""),
        "time":      entry.created_at.strftime("%d/%m/%Y %H:%M") if entry.created_at else "",
        "maps_link": _maps_link(entry.lat, entry.lng),
    }
    return TEMPLATES.get(event, "עדכון במערכת ConcreteTrack").format(**params)


async def send_whatsapp_alert(entry: Entry, event: str, extra: dict = None):
    """
    שולח הודעת WhatsApp לכל הסדרנים.
    event: 'new' | 'urgent' | 'collected' | 'cancelled'
    """
    if not ENABLED:
        print(f"[WhatsApp] Disabled - would send: {event} for {entry.city}")
        return

    message = _build_message(event, entry, extra)
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json"

    async with httpx.AsyncClient() as client:
        for phone in ADMIN_PHONES:
            phone = phone.strip()
            if not phone:
                continue
            to = phone if phone.startswith("whatsapp:") else f"whatsapp:{phone}"
            try:
                resp = await client.post(
                    url,
                    data={"From": FROM_NUMBER, "To": to, "Body": message},
                    auth=(TWILIO_SID, TWILIO_TOKEN),
                    timeout=10
                )
                if resp.status_code not in (200, 201):
                    print(f"[WhatsApp] Error {resp.status_code}: {resp.text}")
                else:
                    print(f"[WhatsApp] Sent '{event}' to {phone}")
            except Exception as e:
                print(f"[WhatsApp] Failed to send to {phone}: {e}")
