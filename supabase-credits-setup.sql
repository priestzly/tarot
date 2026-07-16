-- Profiles tablosuna credits (kredi) sütunu ekleme
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits INT DEFAULT 200;

-- Mevcut kullanıcıların kredilerini 200 olarak güncelleme
UPDATE public.profiles SET credits = 200 WHERE credits IS NULL;
