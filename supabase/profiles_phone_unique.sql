-- טלפון ייחודי: אותו מספר לא יכול להירשם פעמיים (NULL מותר — מספר שורות ללא טלפון).
-- אם ההרצה נכשלת בגלל כפילויות קיימות, נקו ידנית או עדכנו טלפונים לפני האינדקס.

create unique index if not exists profiles_phone_unique
  on public.profiles (phone)
  where phone is not null;
