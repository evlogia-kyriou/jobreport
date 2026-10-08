// ─── Enums ────────────────────────────────────────────────────────────────────

export type WorkTicketStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "approved"
  | "cancelled";

export type ProjectTicketStatus =
  | "draft" // ← NEW ✅ booking being created
  | "pending_confirm" // ← NEW ✅ awaiting customer confirmation
  | "in_progress"
  | "awaiting_final_signature"
  | "completed"
  | "reported"
  | "ditangguhkan"
  | "menunggu_pembatalan"
  | "cancelled"; // ← NEW ✅

export interface ProjectTicketProposedDate {
  id: string;
  project_ticket_id: string;
  proposed_date: string;
  proposed_time?: string;
  notes?: string;
  created_at: string;
}

export interface TicketFlag {
  id: string;
  ticket_id: string;
  flag_type: FlagType;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
  is_confirmed: boolean | null; // ← NEW ✅
  confirmed_by: string | null; // ← NEW ✅
  confirmed_at: string | null; // ← NEW ✅
  dismiss_reason: string | null; // ← NEW ✅
}

export type FlagType =
  | "no_client"
  | "no_pic_signature"
  | "work_reopened"
  | "unit_replacement";

export type CancellationReason =
  | "pelanggan_tidak_ada"
  | "cuaca"
  | "teknisi_berhalangan"
  | "lainnya";

export type TicketType = "cleaning" | "install" | "service";

export type StepType =
  | "numeric_form_photo"
  | "text_conditional_photo"
  | "checklist_only"
  | "checklist_photo"
  | "checklist_conditional_photo"
  | "dynamic_finding";

export type SopSection =
  | "kedatangan"
  | "pencucian_indoor"
  | "pencucian_outdoor"
  | "penyelesaian"
  | "laporan_kerusakan";

export type CustomerType = "person" | "company";
export type CustomerStage =
  | "prospect"
  | "active"
  | "suggested_dormant"
  | "dormant"
  | "churned";
export type CustomerSource =
  | "existing"
  | "referral"
  | "canvassing"
  | "social_media"
  | "walk_in";
export type PhoneLabel = "utama" | "kantor" | "whatsapp" | "lainnya";
export type NoteType = "call" | "visit" | "complaint" | "general";
export type LocationType =
  | "rumah"
  | "ruko"
  | "apartemen"
  | "lantai_kantor"
  | "gedung_kantor"
  | "kios"
  | "pabrik"
  | "kosan"
  | "lainnya";

// ── Reference table types ────────────────────────────────────────────────────

export interface TipeBangunanGroup {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface TipeBangunan {
  id: string;
  group_id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  group?: TipeBangunanGroup;
}

export interface KategoriFungsi {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface RoomName {
  id: string;
  kategori_id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}
export type AcType =
  | "Split"
  | "Cassette"
  | "Standing"
  | "Ducted"
  | "Window"
  | "Portable";
export type JobType = "cleaning" | "service" | "installation";

export type AcCapacity = "0.5" | "0.75" | "1" | "1.5" | "2" | "2.5" | "3";
export type ReportSentVia = "email" | "whatsapp" | "both";
export type UserRole =
  | "admin"
  | "admin_technician"
  | "admin_sales"
  | "manager"
  | "developer";
export type SettingType = "int" | "text" | "boolean";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Technician {
  id: string;
  technician_id: string; // human-readable: "0000001"
  name: string;
  phone: string;
  address?: string;
  skills: string[]; // ['cleaning'] | ['cleaning','install'] etc
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TechnicianShift {
  id: string;
  technician_id: string;
  shift_date: string; // "2024-05-20"
  start_lat?: number;
  start_lng?: number;
  started_at: string;
  created_at: string;
}

// ─── Customer ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  pic_name: string;
  stage: CustomerStage;
  source: CustomerSource;
  acquired_at: string;
  dormant_suggested_at?: string;
  dormant_dismissed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined
  phones?: CustomerPhone[];
}

export interface CustomerPhone {
  id: string;
  customer_id: string;
  phone: string;
  label: PhoneLabel;
  is_primary: boolean;
  created_at: string;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  type: NoteType;
  note: string;
  created_by: string;
  created_at: string;
  // joined
  created_by_user?: { name: string };
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface BuildingRegistry {
  id: string;
  name: string;
  address: string;
  province: string;
  kabupaten: string;
  kecamatan: string;
  kelurahan: string;
  postal_code: string;
  total_floors?: number;
  created_at: string;
}

export interface Location {
  id: string;
  customer_id: string;
  name: string;
  location_number?: string;
  type: LocationType;
  tipe_bangunan_id?: string;
  tipe_bangunan_custom?: string; // when tipe = "Lainnya"
  kategori_fungsi_id?: string;
  kategori_fungsi_custom?: string; // when kategori = "Lainnya"
  buildings_registry_id?: string;
  building_floor?: string;
  // Legacy combined address (auto-rebuilt by trigger)
  address: string;
  // Structured address fields
  address_prefix?: string;
  address_street?: string;
  address_number?: string;
  address_rt?: string;
  address_rw?: string;
  address_block_unit?: string;
  province: string;
  kabupaten: string;
  kecamatan: string;
  kelurahan: string;
  postal_code: string;
  has_survey: boolean;
  survey_notes?: string;
  access_regulations?: string; // permanent rules for technician visits ✅
  notes?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  ac_unit_count?: number;
  customer?: { name: string; pic_name: string };
  building?: { name: string };
  tipe_bangunan?: TipeBangunan;
  kategori_fungsi?: KategoriFungsi;
}

export interface LocationMaintenanceRow {
  location_id: string;
  location_name: string;
  location_type: string;
  kabupaten: string | null;
  province: string | null;
  customer_id: string;
  customer_name: string;
  total_ac: number;
  overdue_count: number;
  due_soon_count: number;
  ok_count: number;
  last_service_date: string | null;
  days_since_service: number | null;
}

export interface Building {
  id: string;
  location_id: string;
  name: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BuildingUnit {
  id: string;
  location_id: string;
  building_id?: string;
  floor?: string;
  room: string;
  zone_label?: string; // A, B, C... or custom
  floor?: string;
  room?: string;
  zone_label?: string;
  notes?: string;
  created_at: string;
}

// ─── Region ───────────────────────────────────────────────────────────────────

export interface Region {
  id: string;
  province: string;
  kabupaten: string;
  kecamatan: string;
  kelurahan: string;
  postal_code: string;
}

// ─── AC ───────────────────────────────────────────────────────────────────────

export interface AcBrand {
  id: string;
  name: string;
  created_at: string;
}

export interface AcUnit {
  id: string;
  ac_code: string; // auto-generated: AC-2024-0000001
  location_id: string;
  building_unit_id: string;
  brand_id: string;
  type: AcType;
  capacity_pk: AcCapacity;
  unit_label: string;
  access_notes?: string;
  last_cleaned_at?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined
  building_unit?: { floor?: string; room?: string; zone_label?: string };
  brand?: { name: string };
}

export interface AcServiceHistory {
  id: string; // HST-YYYYMMDD-0001
  ac_unit_id: string;
  ticket_id?: string;
  event_type: "installed" | "cleaned" | "serviced" | "repaired" | "manual";
  event_date: string;
  performed_by: string;
  notes?: string;
  created_at: string;
}

// ─── Project Ticket ───────────────────────────────────────────────────────────

export interface ProjectTicket {
  id: string;
  project_number: string; // PRJ-202405-0000001
  customer_id: string;
  location_id: string;
  type: TicketType;
  status: ProjectTicketStatus;
  is_flagged: boolean;
  total_ac_units: number;
  report_id?: string;
  report_url?: string;
  report_generated_at?: string;
  report_sent_at?: string;
  report_sent_via?: ReportSentVia;
  report_sent_by?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  customer?: { name: string; pic_name: string };
  location?: { name: string; address: string; kelurahan: string };
  created_by_user?: { name: string };
  // computed
  work_tickets?: WorkTicket[];
}

export interface ProjectTicketAcUnit {
  project_ticket_id: string;
  ac_unit_id: string;
  // joined
  ac_unit?: AcUnit;
}

// ─── Work Ticket ──────────────────────────────────────────────────────────────

export interface WorkTicket {
  id: string;
  ticket_number: string; // TKT-202405-0000001
  project_ticket_id: string;
  type: TicketType;
  status: WorkTicketStatus;
  customer_id: string;
  location_id: string;
  technician_id: string;
  created_by: string;
  scheduled_date: string; // "2024-05-20"
  scheduled_time: string; // "08:00:00"
  estimated_minutes: number;
  arrival_at?: string;
  departure_at?: string;
  is_flagged: boolean;
  flag_notes?: string;
  reopened_at?: string;
  reopened_by?: string;
  reopen_reason?: string;
  cancellation_reason?: CancellationReason;
  cancellation_notes?: string;
  notes?: string;
  cancelled_at?: string;
  submitted_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // joined
  technician?: { name: string; technician_id: string };
  location?: { name: string; address: string };
  customer?: { name: string; pic_name: string };
  project_ticket?: { project_number: string };
  ac_units?: TicketAcUnit[];
}

export interface TicketAcUnit {
  ticket_id: string;
  ac_unit_id: string;
  order_number: number;
  // joined
  ac_unit?: AcUnit;
}

export interface TicketRating {
  id: string;
  ticket_id: string;
  rating: number; // 1-5
  comment?: string;
  rated_by: string;
  rated_at: string;
  created_at: string;
}

// ─── Job Steps ────────────────────────────────────────────────────────────────

export interface JobStep {
  id: string;
  ticket_id: string;
  ac_unit_id: string;
  section: SopSection;
  order_number: number;
  description: string;
  step_type: StepType;
  input_unit?: string;
  input_value?: string;
  is_checked: boolean;
  is_condition_abnormal: boolean;
  photo_url?: string;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: string;
  created_at: string;
}

export interface JobSignature {
  id: string;
  ticket_id: string;
  technician_id: string;
  technician_signature_url?: string;
  technician_signed_at?: string;
  pic_name: string;
  pic_signature_url?: string;
  pic_signed_at?: string;
  created_at: string;
}

export interface TicketReopenLog {
  id: string;
  ticket_id: string;
  reopened_by: string;
  reopen_reason: string;
  step_ids?: string[];
  created_at: string;
  // joined
  reopened_by_user?: { name: string };
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSetting {
  key: string;
  value: string;
  label: string;
  type: SettingType;
  updated_by?: string;
  updated_at: string;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

// Used in Create Project flow Step 5
export interface WorkTicketDraft {
  id: string; // temp local id
  ac_unit_ids: string[];
  technician_id: string;
  scheduled_date: string;
  scheduled_time: string;
  transport_minutes: number;
  estimated_minutes: number; // auto: (ac_units.length * 60) + transport
}

// Used for AC unit selection with floor/room filter
export interface AcUnitWithLocation extends AcUnit {
  building_unit: BuildingUnit;
  brand: AcBrand;
}

// Dashboard stats
export interface DashboardStats {
  active_projects: number;
  submitted_tickets: number;
  flagged_tickets: number; // submitted + is_flagged ✅
  technicians_today: number;
  in_progress_today: number; // in_progress tickets today ✅
  approved_today: number; // approved tickets today ✅
  total_today: number; // total scheduled today ✅
  overdue_ac_units: number;
}

// ── Reminder tracking ─────────────────────────────────────────────────────────

export type ReminderType = "cleaning_cycle" | "temuan";
export type Phase1Status = "belum_dikirim" | "belum_terkirim" | "terkirim";
export type Phase2Status =
  | "menunggu_respons"
  | "pelanggan_setuju"
  | "pelanggan_belum_merespons"
  | "diundur"
  | "tidak_tertarik";

export const DIUNDUR_REASONS = [
  "Sedang renovasi",
  "Jadwal penuh",
  "Sedang musim liburan",
  "Menunggu persetujuan internal",
  "Lainnya",
  "Tidak ada alasan",
] as const;

export const TIDAK_TERTARIK_REASONS = [
  "Sudah pakai vendor lain",
  "Harga tidak sesuai",
  "Pindah lokasi/tutup",
  "Tidak butuh sekarang",
  "Menangani sendiri",
  "Lainnya",
  "Tidak ada alasan",
] as const;

export interface ReminderSend {
  id: string;
  reminder_type: ReminderType;
  customer_id: string | null;
  location_id: string | null;
  ticket_id: string | null;
  phase1_status: Phase1Status;
  sent_at: string | null;
  phase2_status: Phase2Status | null;
  follow_up_date: string | null;
  reason_code: string | null;
  reason_notes: string | null;
  responded_at: string | null; // ← NEW ✅
  response_notes: string | null; // ← NEW ✅
  is_dismissed: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: { name: string } | null;
  location?: { name: string; address: string } | null;
  ticket?: { ticket_number: string; is_flagged: boolean } | null;
}

export interface ReminderRow extends ReminderSend {
  // Computed display fields
  overdue_unit_count?: number;
  last_cleaned_at?: string | null;
  days_overdue?: number;
}
