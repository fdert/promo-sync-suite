-- إضافة المستخدم كمالك لوكالة "مبدع"
INSERT INTO agency_members (agency_id, user_id, role, created_by, is_active) 
VALUES ('5b6c28ae-557e-4516-b6a7-367e8a9bd383', '5f1cdf1d-f44a-4250-9675-cf5e5d5fd4e7', 'owner', '5f1cdf1d-f44a-4250-9675-cf5e5d5fd4e7', true)
ON CONFLICT (agency_id, user_id) DO NOTHING;