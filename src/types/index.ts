export type UserRole = 'owner' | 'mechanic' | 'supplier' | 'rental_provider' | 'admin' | 'customer' | 'technician';
export type SubscriptionTier = 'free' | 'pro';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  is_approved: boolean;
  is_suspended: boolean;
  payment_verified: boolean;
  subscription_tier: SubscriptionTier;
  wallet_balance: number;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  contact_telegram: string | null;
  contact_whatsapp: string | null;
  contact_other: string | null;
  contact_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface MechanicProfile {
  id: string;
  user_id: string;
  specializations: string[];
  years_experience: number;
  service_area: string | null;
  supported_brands: string[];
  hourly_rate: number | null;
  is_available: boolean;
  rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface SupplierProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  supported_brands: string[];
  location: string | null;
  description: string | null;
  rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface RentalProviderProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  location: string | null;
  description: string | null;
  rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Machine {
  id: string;
  owner_id: string;
  machine_type: string;
  machine_model: string;
  brand: string;
  year: number | null;
  serial_number: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type BreakdownUrgency = 'low' | 'medium' | 'high' | 'critical';
export type BreakdownStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'cancelled';

export interface BreakdownRequest {
  id: string;
  owner_id: string;
  machine_id: string | null;
  machine_type: string;
  machine_model: string;
  description: string;
  location: string;
  urgency: BreakdownUrgency;
  status: BreakdownStatus;
  image_url: string | null;
  assigned_mechanic_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: Profile;
  assigned_mechanic?: Profile;
}

export interface PartsListing {
  id: string;
  supplier_id: string;
  part_name: string;
  part_number: string | null;
  description: string | null;
  machine_compatibility: string[];
  category: string;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  supplier?: Profile;
  boost?: BoostedListing | null;
}

export interface EquipmentRental {
  id: string;
  provider_id: string;
  machine_model: string;
  machine_type: string;
  brand: string | null;
  year: number | null;
  hourly_rate: number | null;
  daily_rate: number | null;
  location: string;
  description: string | null;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  provider?: Profile;
}

export interface Review {
  id: string;
  mechanic_id: string;
  reviewer_id: string;
  breakdown_request_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'job_request' | 'message' | 'review' | 'payment' | 'subscription' | 'wallet';
  is_read: boolean;
  related_id: string | null;
  created_at: string;
}

export interface ServiceHistory {
  id: string;
  machine_id: string;
  owner_id: string;
  mechanic_id: string | null;
  service_type: string;
  description: string;
  parts_replaced: string[];
  cost: number | null;
  service_date: string;
  next_service_date: string | null;
  breakdown_request_id: string | null;
  created_at: string;
  mechanic?: Profile;
}

export type FeeType = 'mechanic_contact' | 'parts_inquiry' | 'rental_inquiry' | 'breakdown_post';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type CreditType = 'mechanic' | 'supplier' | 'rental' | 'breakdown';

export interface CommissionFee {
  id: string;
  service_type: FeeType;
  fee_amount: number;
  description: string | null;
  is_active: boolean;
  commission_rate_min: number;
  commission_rate_max: number;
  created_at: string;
  updated_at: string;
}

export interface UserPayment {
  id: string;
  user_id: string;
  fee_type: string;
  amount: number;
  status: PaymentStatus;
  transaction_id: string | null;
  payment_method: string | null;
  provider_id: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  user?: Profile;
}

export interface ContactCredit {
  id: string;
  user_id: string;
  credit_type: CreditType;
  credits_remaining: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactHistory {
  id: string;
  user_id: string;
  provider_id: string;
  contact_type: CreditType;
  payment_id: string | null;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  method_name: string;
  provider: string;
  account_name: string;
  account_number: string;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  role: 'mechanic' | 'supplier';
  name: string;
  price_monthly: number;
  features: string[];
  job_access_limit: number | null;
  lead_cost_per_job: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  role: 'mechanic' | 'supplier';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  started_at: string;
  expires_at: string | null;
  payment_id: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  total_purchased: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export type WalletTransactionType = 'purchase' | 'deduction' | 'refund' | 'bonus';

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_after: number;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  status: 'completed' | 'pending' | 'failed';
  payment_id: string | null;
  created_at: string;
}

export interface JobUnlock {
  id: string;
  technician_id: string;
  breakdown_request_id: string;
  unlock_method: 'wallet' | 'subscription';
  credits_spent: number;
  wallet_transaction_id: string | null;
  created_at: string;
  breakdown_request?: BreakdownRequest;
}

export interface Commission {
  id: string;
  breakdown_request_id: string;
  technician_id: string;
  owner_id: string;
  job_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'paid' | 'disputed' | 'waived';
  notes: string | null;
  created_at: string;
  updated_at: string;
  breakdown_request?: BreakdownRequest;
  technician?: Profile;
  owner?: Profile;
}

export interface BoostedListing {
  id: string;
  listing_id: string;
  supplier_id: string;
  boost_level: 'standard' | 'featured' | 'premium';
  boost_cost: number;
  starts_at: string;
  expires_at: string;
  payment_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerContactUnlock {
  id: string;
  customer_id: string;
  technician_id: string;
  unlock_type: 'contact_fee' | 'quote_accepted';
  payment_id: string | null;
  created_at: string;
}

export type ServiceRequestStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type ServiceCategory = 'mechanic' | 'electrician' | 'hydraulics' | 'transmission' | 'engine' | 'other';

export interface ServiceRequest {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  location: string;
  budget: number | null;
  image_url: string | null;
  status: ServiceRequestStatus;
  accepted_offer_id: string | null;
  created_at: string;
  updated_at: string;
  customer?: Profile;
  offers?: Offer[];
}

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface Offer {
  id: string;
  service_request_id: string;
  technician_id: string;
  customer_id: string;
  price: number;
  message: string | null;
  status: OfferStatus;
  is_contact_unlocked: boolean;
  created_at: string;
  updated_at: string;
  technician?: Profile;
  service_request?: ServiceRequest;
}

export interface ActiveJob {
  id: string;
  service_request_id: string;
  offer_id: string;
  customer_id: string;
  technician_id: string;
  agreed_price: number;
  status: 'accepted' | 'in_progress' | 'completed' | 'disputed';
  commission_rate: number;
  commission_amount: number | null;
  technician_net: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  service_request?: ServiceRequest;
  customer?: Profile;
  technician?: Profile;
}

export interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: number;
  setting_label: string;
  description: string | null;
  updated_at: string;
}

export type ForumCategory = 'general' | 'hydraulics' | 'engine' | 'electrical' | 'transmission' | 'diagnostics' | 'tips' | 'tools' | 'other';

export interface ForumPost {
  id: string;
  author_id: string;
  title: string;
  body: string;
  category: ForumCategory;
  tags: string[];
  view_count: number;
  reply_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
  reaction_count?: number;
  user_reacted?: boolean;
}

export interface ForumReply {
  id: string;
  post_id: string;
  author_id: string;
  parent_reply_id: string | null;
  body: string;
  is_accepted_answer: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
  reaction_count?: number;
  user_reacted?: boolean;
}

export interface Quote {
  id: string;
  breakdown_request_id: string;
  technician_id: string;
  owner_id: string;
  amount: number;
  description: string | null;
  estimated_hours: number | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  accepted_at: string | null;
  rejected_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  technician?: Profile;
  breakdown_request?: BreakdownRequest;
}
