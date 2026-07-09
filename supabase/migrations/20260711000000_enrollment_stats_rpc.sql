-- Optimized aggregation for Enrollment Dashboard
CREATE OR REPLACE FUNCTION get_enrollment_stats(p_status TEXT)
RETURNS JSONB AS $$
DECLARE
    v_pending_count BIGINT;
    v_approved_count BIGINT;
    v_rejected_count BIGINT;
    v_email_queue_count BIGINT;
    v_school_stats JSONB;
BEGIN
    -- Get global status counts in a single pass
    SELECT
        count(*) FILTER (WHERE status = 'pending'),
        count(*) FILTER (WHERE status = 'approved'),
        count(*) FILTER (WHERE status = 'rejected')
    INTO v_pending_count, v_approved_count, v_rejected_count
    FROM enrollment_requests;

    -- Get pending email queue count
    SELECT count(*) INTO v_email_queue_count FROM email_queue WHERE status = 'pending';

    -- Aggregate stats by school for the specific status
    -- We use a single query to build the JSON object
    SELECT COALESCE(jsonb_object_agg(school_name, stats), '{}'::jsonb)
    INTO v_school_stats
    FROM (
        SELECT
            COALESCE(school, 'Unknown') as school_name,
            jsonb_build_object(
                'Male', count(*) FILTER (WHERE gender = 'Male'),
                'Female', count(*) FILTER (WHERE gender = 'Female'),
                'Total', count(*)
            ) as stats
        FROM enrollment_requests
        WHERE status = p_status
        GROUP BY school
    ) school_groups;

    RETURN jsonb_build_object(
        'summary', jsonb_build_object(
            'pending', v_pending_count,
            'approved', v_approved_count,
            'rejected', v_rejected_count
        ),
        'emailQueueCount', v_email_queue_count,
        'statsBySchool', COALESCE(v_school_stats, '{}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
