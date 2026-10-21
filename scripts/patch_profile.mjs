import fs from 'fs';

let content = fs.readFileSync('src/pages/Profile.jsx', 'utf8');

const targetIndex = content.indexOf('const [endorseModalOpen, setEndorseModalOpen] = useState(false);');
if (targetIndex === -1) {
    console.error('Target not found');
    process.exit(1);
}

const endIndex = content.indexOf('const [showGalleryView, setShowGalleryView] = useState(false);', targetIndex);
const lineEnd = content.indexOf('\n', endIndex) + 1;
const fullEndIndex = content.indexOf('\n', content.indexOf('const profileId = userId || currentUser?.id;', targetIndex)) + 1;

console.log('Replacing from', targetIndex, 'to', fullEndIndex);

const replacement = `const [endorseModalOpen, setEndorseModalOpen] = useState(false);
    const isOwnProfile = !userId || userId === currentUser?.id;
    const profileId = userId || currentUser?.id;
    const [vibeEndorsements, setVibeEndorsements] = useState([]);

    useEffect(() => {
        if (profileId) {
            setVibeEndorsements(getUserVibeEndorsements(profileId, currentUser?.id));
        }
    }, [profileId, currentUser?.id]);

    useEffect(() => {
        const handleVibeEndorsed = (e) => {
            if (e.detail?.targetUserId === profileId) {
                setVibeEndorsements(getUserVibeEndorsements(profileId, currentUser?.id));
            }
        };
        window.addEventListener('tcd:vibe_endorsed', handleVibeEndorsed);
        return () => window.removeEventListener('tcd:vibe_endorsed', handleVibeEndorsed);
    }, [profileId, currentUser?.id]);

    // Gift & Coins Integration
    const [showGiftStore, setShowGiftStore] = useState(false);
    const [showCoinStore, setShowCoinStore] = useState(false);
    const [coinBalance, setCoinBalance] = useState(0);
    const [conversationId, setConversationId] = useState(
        location.state?.conversationId || location.state?.matchId || null
    );
    const queryParams = new URLSearchParams(location.search);
    const isFromChat = Boolean(location.state?.fromChat || queryParams.get('fromChat') === 'true');
    const [showGalleryView, setShowGalleryView] = useState(false);
`;

const isCrlf = content.includes('\r\n');
const normalizedReplacement = isCrlf ? replacement.replace(/\n/g, '\r\n') : replacement;

content = content.slice(0, targetIndex) + normalizedReplacement + content.slice(fullEndIndex);
fs.writeFileSync('src/pages/Profile.jsx', content, 'utf8');
console.log('Successfully patched Profile.jsx!');
