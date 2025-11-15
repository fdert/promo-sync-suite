import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * استبدال المتغيرات في نص القالب
 */
export function replaceVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, String(value))
  }
  
  return result
}

/**
 * جلب قالب رسالة واستبدال المتغيرات
 */
export async function renderTemplate(
  supabase: SupabaseClient,
  templateName: string,
  variables: Record<string, string | number>
): Promise<string | null> {
  try {
    const { data: template, error } = await supabase
      .from('message_templates')
      .select('content, is_active')
      .eq('name', templateName)
      .single()
    
    if (error || !template || !template.is_active) {
      console.error(`Template ${templateName} not found or inactive:`, error)
      return null
    }
    
    return replaceVariables(template.content, variables)
  } catch (error) {
    console.error(`Error rendering template ${templateName}:`, error)
    return null
  }
}
