export type SignalType = 'video' | 'comment' | 'profile' | 'chat' | 'image';

export type AnomalyCategory =
  | 'Malicious Transmission'
  | 'Harmful Frequency'
  | 'Hate Resonance'
  | 'Restricted Signal'
  | 'Incompatible Code'
  | 'Distorted Reality'
  | 'Biometric Fraud'
  | 'Spectrum Overload'
  | 'Signal Piracy'
  | 'Agent Harassment'
  | 'Illegal Traffic'
  | 'Privacy Breach'
  | 'Cruelty Log'
  | 'Terror Directive'
  | 'Other Deviation';

export type AuditStatus = 'detecting' | 'analyzing' | 'resolved' | 'dismissed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SignalAudit {
  id: string;
  initiator_id: string;
  target_user_id: string;
  signal_type: SignalType;
  signal_id: string;
  anomaly_category: AnomalyCategory;
  neural_log?: string;
  evidence_fingerprint?: string;
  audit_status: AuditStatus;
  risk_level: RiskLevel;
  neural_confidence: number;
  spectrum_priority: number;
  created_at: string;
  audited_by?: string;
  audited_at?: string;
}

export type DirectiveType =
  | 'Issue Strike'
  | 'Terminate Signal'
  | 'Restore Frequency'
  | 'Isolate Channel'
  | 'Wipe Profile'
  | 'Ignore Interference';

export interface AuditDirective {
  id: string;
  audit_id: string;
  commander_id: string;
  target_id: string;
  directive_type: DirectiveType;
  rationale?: string;
  created_at: string;
}
