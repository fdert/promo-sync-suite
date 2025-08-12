-- إعادة إنشاء الطلب ORD-063 المحذوف
INSERT INTO public.orders (
    id,
    order_number,
    customer_id,
    service_name,
    description,
    amount,
    priority,
    status,
    payment_type,
    due_date,
    created_by,
    created_at,
    updated_at,
    agency_id,
    progress
) VALUES (
    '5a158d9b-b3f8-4e5a-99a9-9472c44515c1',
    'ORD-063',
    'b0e8d312-f720-45d4-a8f6-460d29c4430c',
    'استيكر قص بلوتر مع تركيب',
    'طباعة على 2 صحن + 3 كاسات + 2 كرت طاولة',
    56,
    'عالية',
    'قيد التنفيذ',
    'دفع آجل',
    '2025-08-12',
    '4f6cc8fc-e006-4bf6-9802-5e6ce121c2a5',
    '2025-08-11 20:25:28.500288+00',
    now(),
    '946d9c5b-f479-4f35-b73d-85d309768932',
    0
);

-- إعادة إضافة بنود الطلب بناءً على الوصف
INSERT INTO public.order_items (
    order_id,
    item_name,
    quantity,
    unit_price,
    total_amount
) VALUES 
(
    '5a158d9b-b3f8-4e5a-99a9-9472c44515c1',
    'طباعة على 2 صحن + 3 كاسات + 2 كرت طاولة',
    1,
    56,
    56
);