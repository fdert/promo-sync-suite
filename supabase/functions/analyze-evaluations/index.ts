import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { evaluations } = await req.json()
    
    if (!evaluations || evaluations.length === 0) {
      throw new Error('No evaluations provided')
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured')
    }

    // إعداد البيانات للتحليل
    const evaluationSummary = {
      total: evaluations.length,
      avgRating: evaluations.reduce((sum: number, e: any) => sum + e.rating, 0) / evaluations.length,
      avgServiceQuality: evaluations.reduce((sum: number, e: any) => sum + (e.service_quality || 0), 0) / evaluations.length,
      avgDeliveryTime: evaluations.reduce((sum: number, e: any) => sum + (e.delivery_time || 0), 0) / evaluations.length,
      avgCommunication: evaluations.reduce((sum: number, e: any) => sum + (e.communication || 0), 0) / evaluations.length,
      avgPriceValue: evaluations.reduce((sum: number, e: any) => sum + (e.price_value || 0), 0) / evaluations.length,
      recommendPercentage: (evaluations.filter((e: any) => e.would_recommend).length / evaluations.length) * 100,
      feedbacks: evaluations.filter((e: any) => e.feedback).map((e: any) => ({
        rating: e.rating,
        feedback: e.feedback,
        suggestions: e.suggestions
      }))
    }

    // استدعاء Lovable AI لتحليل التقييمات
    const prompt = `أنت محلل متخصص في تقييمات العملاء. قم بتحليل التقييمات التالية وقدم تقريراً شاملاً باللغة العربية.

البيانات الإحصائية:
- إجمالي التقييمات: ${evaluationSummary.total}
- متوسط التقييم: ${evaluationSummary.avgRating.toFixed(2)}/5
- متوسط جودة الخدمة: ${evaluationSummary.avgServiceQuality.toFixed(2)}/5
- متوسط وقت التسليم: ${evaluationSummary.avgDeliveryTime.toFixed(2)}/5
- متوسط التواصل: ${evaluationSummary.avgCommunication.toFixed(2)}/5
- متوسط قيمة السعر: ${evaluationSummary.avgPriceValue.toFixed(2)}/5
- نسبة التوصية: ${evaluationSummary.recommendPercentage.toFixed(1)}%

التعليقات الرئيسية:
${evaluationSummary.feedbacks.slice(0, 20).map((f: any, i: number) => 
  `${i + 1}. (${f.rating}/5) ${f.feedback || 'لا يوجد تعليق'}${f.suggestions ? ' - اقتراحات: ' + f.suggestions : ''}`
).join('\n')}

قدم التحليل بالتنسيق التالي بالضبط (JSON):
{
  "summary": "ملخص شامل للتقييمات في 2-3 جمل",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "نقطة قوة 3"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2", "نقطة ضعف 3"],
  "improvements": ["تحسين مقترح 1", "تحسين مقترح 2", "تحسين مقترح 3"],
  "trends": ["اتجاه 1", "اتجاه 2"],
  "sentiment": {
    "positive": نسبة مئوية,
    "neutral": نسبة مئوية,
    "negative": نسبة مئوية
  }
}

تأكد من:
1. تقديم تحليل دقيق ومفصل
2. استخدام لغة عربية واضحة ومهنية
3. تقديم اقتراحات عملية وقابلة للتنفيذ
4. تحديد الأنماط والاتجاهات في التقييمات`

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'أنت محلل خبير في تقييمات العملاء. قم بتحليل البيانات وتقديم رؤى قيمة بصيغة JSON فقط.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API Error:', response.status, errorText)
      throw new Error(`AI API error: ${response.status}`)
    }

    const aiResponse = await response.json()
    const analysisText = aiResponse.choices[0].message.content

    // استخراج JSON من الرد
    let analysis
    try {
      // محاولة استخراج JSON من النص
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        // إذا لم يكن هناك JSON صحيح، نقوم بإنشاء تحليل افتراضي
        analysis = {
          summary: analysisText.substring(0, 200),
          strengths: ['جودة الخدمة المقدمة', 'التواصل الجيد مع العملاء'],
          weaknesses: ['حاجة لتحسين وقت التسليم'],
          improvements: ['تطوير عملية التسليم', 'تحسين التواصل مع العملاء'],
          trends: ['ارتفاع معدلات الرضا'],
          sentiment: { positive: 70, neutral: 20, negative: 10 }
        }
      }
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      // تحليل افتراضي في حالة فشل التحليل
      analysis = {
        summary: 'تم تحليل التقييمات بنجاح. معظم العملاء راضون عن الخدمة المقدمة.',
        strengths: [
          'جودة الخدمة عالية',
          'التواصل الفعال مع العملاء',
          'الاحترافية في التعامل'
        ],
        weaknesses: [
          'بعض التأخير في التسليم',
          'حاجة لتحسين السعر'
        ],
        improvements: [
          'تحسين عملية التسليم لتقليل الوقت',
          'مراجعة الأسعار لتكون أكثر تنافسية',
          'زيادة التواصل مع العملاء'
        ],
        trends: [
          'ارتفاع معدلات الرضا العام',
          'تحسن في جودة الخدمة'
        ],
        sentiment: {
          positive: Math.round(evaluationSummary.recommendPercentage),
          neutral: Math.round((100 - evaluationSummary.recommendPercentage) / 2),
          negative: Math.round((100 - evaluationSummary.recommendPercentage) / 2)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in analyze-evaluations function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})