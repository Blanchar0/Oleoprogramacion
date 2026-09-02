-- Migración para caracterización técnica de lotes en la tabla public.locations
-- Ejecutar este script en Supabase SQL Editor si deseas habilitar el guardado de estos campos en la base de datos

ALTER TABLE public.locations 
  ADD COLUMN IF NOT EXISTS ano_siembra NUMERIC,
  ADD COLUMN IF NOT EXISTS ha NUMERIC,
  ADD COLUMN IF NOT EXISTS palmas_diferenciadas NUMERIC;
