import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { verifyPaystackPayment } from '../services/paymentService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../components/Toast';

export default function PaymentCallback() {
    const { currentUser, fetchProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('Verifying your payment...');
    const [error, setError] = useState('');
    const reference = useMemo(() => searchParams.get('reference') || searchParams.get('trxref'), [searchParams]);

    useEffect(() => {
        let cancelled = false;

        async function verifyPayment() {
            if (!reference) {
                setError('Missing payment reference.');
                return;
            }

            if (!currentUser) {
                setStatus('Waiting for your secure session...');
                return;
            }

            setStatus('Confirming payment with Paystack...');
            const { data, error: verifyError } = await verifyPaystackPayment(reference);

            if (cancelled) return;

            if (verifyError) {
                setError(verifyError);
                addToast('Payment verification failed. Please contact support if you were charged.', 'error');
                return;
            }

            const productType = data?.result?.product_type;
            addToast(productType === 'subscription' ? 'Premium activated successfully!' : 'Wallet funded successfully!', 'success');
            await fetchProfile(currentUser.id);
            navigate(productType === 'subscription' ? '/premium' : '/wallet', { replace: true });
        }

        verifyPayment();

        return () => {
            cancelled = true;
        };
    }, [addToast, currentUser, fetchProfile, navigate, reference]);

    if (error) {
        return (
            <div className="auth-callback-page">
                <div className="auth-callback-card">
                    <h1>Payment Needs Attention</h1>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/premium', { replace: true })}>
                        Back to Premium
                    </button>
                </div>
            </div>
        );
    }

    return <LoadingSpinner fullScreen text={status} />;
}
