-- إنشاء webhook خاص لرسائل المتابعة الداخلية
INSERT INTO webhook_settings (
    webhook_name,
    webhook_type,
    webhook_url,
    is_active,
    order_statuses,
    created_by
) VALUES (
    'رسائل المتابعة الداخلية',
    'follow_up',
    'https://gcuqfxacnbxdldsbmgvf.supabase.co/functions/v1/send-follow-up-messages',
    true,
    ARRAY['order_created', 'delivery_delay', 'payment_delay'],
    '90b43c58-7b69-4cae-9e8d-854a5a4c8ffb'
) ON CONFLICT DO NOTHING;