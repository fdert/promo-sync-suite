import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sqlContent = await file.text();
    
    // Parse SQL to extract preview information
    const lines = sqlContent.split('\n');
    const insertStatements = lines.filter(line => line.trim().startsWith('INSERT INTO'));
    
    const tableStats: Record<string, number> = {};
    
    insertStatements.forEach(line => {
      const match = line.match(/INSERT INTO public\.(\w+)/);
      if (match) {
        const tableName = match[1];
        tableStats[tableName] = (tableStats[tableName] || 0) + 1;
      }
    });

    const preview = {
      fileName: file.name,
      fileSize: file.size,
      totalLines: lines.length,
      totalInserts: insertStatements.length,
      tableStats,
      firstLines: lines.slice(0, 20).join('\n'),
    };

    return new Response(
      JSON.stringify({ success: true, preview }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error previewing backup:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
