# 🏗️ ConcreteTrack - מערכת מעקב יציקות בטון
<img width="1278" height="556" alt="1778761275757" src="https://github.com/user-attachments/assets/92a6fba9-c7c6-43ac-a73d-f688b5a7dcfe" />
<img width="480" height="906" alt="1778761275964" src="https://github.com/user-attachments/assets/447a17bd-8864-4406-af1b-61c2930fcb98" />

## ארכיטקטורה

```
Frontend (React/Vite)     Backend (FastAPI)      Storage
─────────────────────     ─────────────────      ──────────
לוח בקרה אזורי     ←→    /api/entries     ←→    PostgreSQL
תיעוד הכנה חדשה   ←→    /api/auth              AWS S3 (מדיה)
סימון איסוף        ←→    /api/stats
ניהול משתמשים      ←→    /api/users
```

## הרצה מהירה (פיתוח)

```bash
# 1. התקנת תלויות
pip install -r requirements.txt

# 2. הגדרת env (לפיתוח SQLite אוטומטי)
cp .env.example .env

# 3. הרצה
uvicorn main:app --reload

# Swagger UI: http://localhost:8000/docs
```

## הרצה עם Docker (פרודקשן)

```bash
cp .env.example .env
# ערוך .env עם הערכים האמיתיים

docker-compose up -d
```

## API Endpoints

### Auth
| Method | Path | תיאור |
|--------|------|-------|
| POST | /api/auth/login | כניסה - מחזיר JWT |
| GET  | /api/auth/me | פרטי המשתמש הנוכחי |

### Entries (הכנות)
| Method | Path | תיאור | הרשאה |
|--------|------|-------|-------|
| GET  | /api/entries/ | רשימת הכנות | כל משתמש |
| POST | /api/entries/ | תיעוד הכנה חדשה | כל משתמש |
| POST | /api/entries/{id}/media | העלאת תמונה/סרטון → S3 | כל משתמש |
| POST | /api/entries/{id}/collect | סימון נאסף + חתימה | כל משתמש |
| GET  | /api/entries/by-region | קיבוץ לפי אזור | כל משתמש |
| DELETE | /api/entries/{id} | ביטול רשומה | סדרן בלבד |

### Stats
| Method | Path | תיאור | הרשאה |
|--------|------|-------|-------|
| GET  | /api/stats/dashboard | מספרי סיכום | סדרן |

### Users
| Method | Path | תיאור | הרשאה |
|--------|------|-------|-------|
| GET  | /api/users/ | רשימת משתמשים | סדרן |
| POST | /api/users/ | יצירת משתמש | סדרן |
| PATCH | /api/users/{id}/deactivate | השבתת משתמש | סדרן |

## משתמשי ברירת מחדל

| משתמש | סיסמא | תפקיד |
|-------|-------|-------|
| inspector | 1234 | בודק שטח (משותף) |
| admin | admin123 | סדרן / מנהל |

## AWS S3 - הגדרה

1. צור Bucket בשם `concretetrack-media` באזור `il-central-1`
2. הגדר Bucket Policy: **Private** (לא ציבורי)
3. צור IAM User עם הרשאות `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`
4. הכנס מפתחות ב-.env

## סטטוסים

| סטטוס | תיאור | צבע |
|-------|-------|-----|
| waiting | ממתין לאיסוף | צהוב |
| urgent | מעל 24 שעות - דחוף | אדום |
| collected | נאסף וחתום | ירוק |
| cancelled | בוטל ע"י סדרן | אפור |

## אפשרויות הרחבה (שלב ב')

- [ ] התראות WhatsApp (Twilio) על הכנה חדשה / דחוף
- [ ] מפה אינטראקטיבית (Mapbox/Google Maps) עם פינים לפי אזור
- [ ] ייצוא Excel חודשי אוטומטי
- [ ] אפליקציית מובייל (PWA)
- [ ] היסטוריית שינויים מלאה לכל רשומה
- [ ] דוחות PDF עם לוגו לחברה
