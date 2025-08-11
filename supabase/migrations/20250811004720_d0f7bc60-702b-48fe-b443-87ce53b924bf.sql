-- إضافة المستخدمين المنشئين للوكالات كأعضاء مالكين
INSERT INTO agency_members (agency_id, user_id, role, created_by, is_active)
SELECT 
    a.id as agency_id,
    a.created_by as user_id,
    'owner' as role,
    a.created_by as created_by,
    true as is_active
FROM agencies a
WHERE NOT EXISTS (
    SELECT 1 
    FROM agency_members am 
    WHERE am.agency_id = a.id 
    AND am.user_id = a.created_by 
    AND am.is_active = true
);