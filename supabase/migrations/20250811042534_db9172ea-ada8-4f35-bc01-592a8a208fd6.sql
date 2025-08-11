-- Delete user with email ibdaa.adve@gmail.com and all related data

-- First, get the user ID
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Get the user ID for the email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'ibdaa.adve@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Delete user roles
        DELETE FROM user_roles WHERE user_id = target_user_id;
        
        -- Delete user permissions
        DELETE FROM user_permissions WHERE user_id = target_user_id;
        
        -- Delete agency memberships
        DELETE FROM agency_members WHERE user_id = target_user_id;
        
        -- Delete activity logs created by this user
        DELETE FROM activity_logs WHERE user_id = target_user_id;
        
        -- Delete the user from auth.users (this will cascade to other tables)
        DELETE FROM auth.users WHERE id = target_user_id;
        
        RAISE NOTICE 'User with email ibdaa.adve@gmail.com has been deleted successfully';
    ELSE
        RAISE NOTICE 'User with email ibdaa.adve@gmail.com not found';
    END IF;
END $$;