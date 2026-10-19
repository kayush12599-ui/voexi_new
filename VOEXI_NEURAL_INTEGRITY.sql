-- VOEXI NEURAL INTEGRITY & SIGNAL AUDIT SYSTEM
-- A completely original moderation architecture

-- 1. Core Audit Table
CREATE TABLE IF NOT EXISTS signal_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('video', 'comment', 'profile', 'chat')),
    signal_id UUID NOT NULL,
    anomaly_category TEXT NOT NULL CHECK (anomaly_category IN (
        'Malicious Transmission', -- Spam/Scam
        'Harmful Frequency',     -- Harassment/Violence
        'Hate Resonance',        -- Hate Speech
        'Restricted Signal',     -- Adult/Child Safety
        'Incompatible Code',     -- Copyright
        'Distorted Reality',     -- Fake Info
        'Other Deviation'
    )),
    neural_log TEXT, -- User description
    evidence_fingerprint TEXT, -- Screenshot URL
    audit_status TEXT DEFAULT 'detecting' CHECK (audit_status IN ('detecting', 'analyzing', 'resolved', 'dismissed')),
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    neural_confidence FLOAT DEFAULT 0.0,
    spectrum_priority INTEGER DEFAULT 1, -- 1-5
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    audited_by UUID REFERENCES profiles(id),
    audited_at TIMESTAMP WITH TIME ZONE
);

-- 2. Audit Directives (Actions)
CREATE TABLE IF NOT EXISTS audit_directives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES signal_audits(id) ON DELETE CASCADE,
    commander_id UUID REFERENCES profiles(id), -- Admin
    target_id UUID REFERENCES profiles(id),
    directive_type TEXT NOT NULL CHECK (directive_type IN (
        'Issue Strike',
        'Terminate Signal', -- Remove content
        'Restore Frequency', -- Restore content
        'Isolate Channel',  -- Suspend
        'Wipe Profile',     -- Ban
        'Ignore Interference'
    )),
    rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Neural Strikes (Warnings)
CREATE TABLE IF NOT EXISTS neural_strikes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    audit_id UUID REFERENCES signal_audits(id),
    severity INTEGER DEFAULT 1,
    justification TEXT,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS POLICIES
ALTER TABLE signal_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE neural_strikes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Initiators can see their audits" ON signal_audits
    FOR SELECT USING (auth.uid() = initiator_id);

CREATE POLICY "Initiators can file audits" ON signal_audits
    FOR INSERT WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Commanders full access" ON signal_audits
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Commanders manage directives" ON audit_directives
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users see their own strikes" ON neural_strikes
    FOR SELECT USING (auth.uid() = user_id);
