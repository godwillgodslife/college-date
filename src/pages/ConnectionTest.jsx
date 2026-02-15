import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ConnectionTest() {
    const { currentUser } = useAuth();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    const runDiagnostics = async () => {
        setLoading(true);
        const report = {
            user_id: currentUser?.id,
            matches: [],
            snapshot_insert_test: null,
            snapshot_select_test: null,
            rpc_test: null
        };

        try {
            // 1. Check Matches (Swipes)
            const { data: swipes, error: swipeError } = await supabase
                .from('swipes')
                .select('*')
                .or(`swiper_id.eq.${currentUser?.id},swiped_id.eq.${currentUser?.id}`);

            report.matches = swipeError ? `Error: ${swipeError.message}` : swipes;

            // 2. Test Snapshot Insert (Dry Run)
            // We'll try to insert a dummy record
            if (currentUser) {
                const { data: insertData, error: insertError } = await supabase
                    .from('snapshots')
                    .insert({
                        user_id: currentUser.id,
                        media_url: 'https://via.placeholder.com/150',
                        description: 'DEBUG_TEST_' + Date.now()
                    })
                    .select()
                    .single();

                report.snapshot_insert_test = insertError ? insertError : 'Success (ID: ' + insertData?.id + ')';

                // Clean up if successful
                if (insertData) {
                    await supabase.from('snapshots').delete().eq('id', insertData.id);
                }
            } else {
                report.snapshot_insert_test = 'Skipped: No User Logged In';
            }

            // 3. Test Snapshot Visibility
            const { count, error: selectError } = await supabase
                .from('snapshots')
                .select('*', { count: 'exact', head: true });

            report.snapshot_select_test = selectError ? selectError : `Visible Snapshots Count: ${count}`;

            // 4. Test RPC (Hidden Counts)
            if (currentUser) {
                const { data: rpcData, error: rpcError } = await supabase
                    .rpc('get_hidden_content_counts', { v_user_id: currentUser.id });
                report.rpc_test = rpcError ? rpcError : rpcData;
            }

        } catch (err) {
            report.crash_error = err.message;
        }

        setResults(report);
        setLoading(false);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'white' }}>
            <h1>System Diagnostics</h1>
            <p>User ID: {currentUser?.id || 'Not Logged In'}</p>

            <button
                onClick={runDiagnostics}
                disabled={loading || !currentUser}
                style={{
                    padding: '10px 20px',
                    background: '#6c63ff',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    marginTop: '1rem'
                }}
            >
                {loading ? 'Running Tests...' : 'Run Permission Checks'}
            </button>

            {results && (
                <div style={{ marginTop: '2rem', background: '#333', padding: '1rem', borderRadius: '8px' }}>
                    <h3>Diagnostic Report</h3>
                    <pre style={{ overflow: 'auto', maxHeight: '500px', fontSize: '12px' }}>
                        {JSON.stringify(results, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
