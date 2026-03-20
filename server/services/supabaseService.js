import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase-Credentials fehlen! SUPABASE_URL und SUPABASE_ANON_KEY setzen.');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Bestellungen laden – optional nach Datum und/oder Filiale filtern
 */
export async function ladeBestellungen(filter = {}) {
  let query = supabase
    .from('bestellungen')
    .select('*')
    .order('zeitstempel', { ascending: false });

  if (filter.datum) {
    query = query
      .gte('zeitstempel', `${filter.datum}T00:00:00.000Z`)
      .lte('zeitstempel', `${filter.datum}T23:59:59.999Z`);
  }
  if (filter.filiale_id) {
    query = query.eq('filiale_id', filter.filiale_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Supabase Fehler (laden): ${error.message}`);
  return data || [];
}

/**
 * Eine Bestellung einfügen
 */
export async function speichereBestellung(bestellung) {
  const { data, error } = await supabase
    .from('bestellungen')
    .insert(bestellung)
    .select()
    .single();

  if (error) throw new Error(`Supabase Fehler (speichern): ${error.message}`);
  return data;
}

/**
 * Anzahl der Bestellungen einer Filiale für ein Datum (für laufende ID-Vergabe)
 */
export async function zaehleFilialBestellungen(filiale_id, datum) {
  const { count, error } = await supabase
    .from('bestellungen')
    .select('*', { count: 'exact', head: true })
    .eq('filiale_id', filiale_id)
    .gte('zeitstempel', `${datum}T00:00:00.000Z`)
    .lte('zeitstempel', `${datum}T23:59:59.999Z`);

  if (error) throw new Error(`Supabase Fehler (zählen): ${error.message}`);
  return count || 0;
}
