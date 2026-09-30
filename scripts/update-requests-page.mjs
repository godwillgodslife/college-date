import fs from 'fs';

let code = fs.readFileSync('src/pages/Requests.jsx', 'utf8').replace(/\r\n/g, '\n');

const targetOldActions = `{req.locked || !isPremium ? (
                                <div className="request-actions">
                                    <button className="btn-accept" onClick={() => navigate('/premium')}>
                                        Get Premium
                                    </button>
                                </div>
                            ) : (
                                <div className="request-actions">
                                    <button
                                        className="btn-accept"
                                        disabled={actioning === req.id}
                                        onClick={() => handleAccept(req.id)}
                                    >
                                        {actioning === req.id ? '...' : 'Accept'}
                                    </button>
                                    <button
                                        className="btn-decline"
                                        disabled={actioning === req.id}
                                        onClick={() => handleDecline(req.id)}
                                    >
                                        Decline
                                    </button>
                                </div>
                            )}`;

const newActions = `{req.locked ? (
                                <div className="request-actions">
                                    <button className="btn-accept" onClick={() => navigate('/premium')}>
                                        Unlock with Premium 👑
                                    </button>
                                </div>
                            ) : (
                                <div className="request-actions">
                                    {!isPremium && (requestSummary.free_accepts_remaining ?? 3) <= 0 ? (
                                        <button className="btn-accept btn-limit" onClick={() => navigate('/premium')}>
                                            Limit Reached • Upgrade to Accept 👑
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                className="btn-accept"
                                                disabled={actioning === req.id}
                                                onClick={() => handleAccept(req.id)}
                                            >
                                                {actioning === req.id ? '...' : 'Accept'}
                                            </button>
                                            <button
                                                className="btn-decline"
                                                disabled={actioning === req.id}
                                                onClick={() => handleDecline(req.id)}
                                            >
                                                Decline
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}`;

if (code.includes(targetOldActions)) {
    code = code.replace(targetOldActions, newActions);
    fs.writeFileSync('src/pages/Requests.jsx', code, 'utf8');
    console.log('Successfully updated action buttons in Requests.jsx');
} else {
    console.log('Target actions not found!');
}
