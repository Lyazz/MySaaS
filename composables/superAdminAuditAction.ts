export type AuditActionColor = 'slate' | 'emerald' | 'indigo' | 'lime' | 'amber' | 'red'

export interface AuditActionMeta {
  icon: string
  color: AuditActionColor
  labelKey: string
}

const AUDIT_ACTION_META: Record<string, AuditActionMeta> = {
  CREATE_TENANT: { icon: 'lucide:plus-circle', color: 'emerald', labelKey: 'superAdmin.audit.actions.createTenant' },
  UPDATE_TENANT: { icon: 'lucide:pencil', color: 'indigo', labelKey: 'superAdmin.audit.actions.updateTenant' },
  DELETE_TENANT: { icon: 'lucide:trash-2', color: 'red', labelKey: 'superAdmin.audit.actions.deleteTenant' },
  SUSPEND_TENANT: { icon: 'lucide:pause-circle', color: 'amber', labelKey: 'superAdmin.audit.actions.suspendTenant' },
  UNSUSPEND_TENANT: { icon: 'lucide:play-circle', color: 'emerald', labelKey: 'superAdmin.audit.actions.unsuspendTenant' },
  IMPERSONATE_USER: { icon: 'lucide:user', color: 'lime', labelKey: 'superAdmin.audit.actions.impersonateUser' },
  ARCHIVE_TENANT: { icon: 'lucide:archive', color: 'amber', labelKey: 'superAdmin.audit.actions.archiveTenant' },
  RESTORE_TENANT: { icon: 'lucide:rotate-ccw', color: 'emerald', labelKey: 'superAdmin.audit.actions.restoreTenant' },
  SET_TENANT_PLAN: { icon: 'lucide:credit-card', color: 'indigo', labelKey: 'superAdmin.audit.actions.setTenantPlan' },
  IMPORT_PAYMENT_PROOF: { icon: 'lucide:upload', color: 'lime', labelKey: 'superAdmin.audit.actions.importPaymentProof' },
  REVIEW_PAYMENT: { icon: 'lucide:check-circle', color: 'emerald', labelKey: 'superAdmin.audit.actions.reviewPayment' },
  VIEW_PAYMENT_PROOF: { icon: 'lucide:eye', color: 'slate', labelKey: 'superAdmin.audit.actions.viewPaymentProof' },
  LIST_TENANT_PAYMENTS: { icon: 'lucide:list', color: 'slate', labelKey: 'superAdmin.audit.actions.listTenantPayments' }
}

const DEFAULT_AUDIT_ACTION_META: AuditActionMeta = { icon: 'lucide:file-text', color: 'slate', labelKey: '' }

export const getAuditActionMeta = (action: string): AuditActionMeta => AUDIT_ACTION_META[action] ?? DEFAULT_AUDIT_ACTION_META

export const AUDIT_ACTION_TYPES = Object.keys(AUDIT_ACTION_META)
