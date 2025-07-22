// Centralized business options for onboarding, profile, and idea creation

export const BUSINESS_VERTICAL_GROUPS = [
  {
    label: "Consumer-Facing Industries",
    options: [
      "Retail", "Hospitality", "Fashion & Apparel", "Food & Beverage", "Media & Entertainment"
    ]
  },
  {
    label: "Technology & Innovation",
    options: [
      "Technology", "Telecommunications", "Pharmaceuticals"
    ]
  },
  {
    label: "Infrastructure & Industrial",
    options: [
      "Manufacturing", "Energy", "Construction", "Automotive", "Transportation & Logistics"
    ]
  },
  {
    label: "Public & Social Good",
    options: [
      "Healthcare", "Education", "Government & Public Sector", "Non-Profit & Social Impact"
    ]
  },
  {
    label: "Financial & Property",
    options: [
      "Finance", "Real Estate"
    ]
  },
  {
    label: "Natural Resources",
    options: [
      "Agriculture"
    ]
  }
];

export const BUSINESS_HORIZONTAL_GROUPS = [
  {
    label: "Technology & Data",
    options: [
      "Information Technology (IT)",
      "Data Analytics & Business Intelligence",
      "Cybersecurity",
      "Artificial Intelligence & Machine Learning",
      "Cloud Services",
      "Enterprise Resource Planning (ERP)",
      "Digital Transformation"
    ]
  },
  {
    label: "Customer & Market",
    options: [
      "Marketing & Advertising",
      "Sales",
      "Customer Relationship Management (CRM)",
      "Customer Experience (CX)"
    ]
  },
  {
    label: "Operations & Supply",
    options: [
      "Supply Chain Management",
      "Operations Management",
      "Facilities Management"
    ]
  },
  {
    label: "People & Development",
    options: [
      "Human Resources",
      "Training & Development"
    ]
  },
  {
    label: "Finance & Legal",
    options: [
      "Finance & Accounting", 
      "Legal Services"
    ]
  },
  {
    label: "Innovation & Sustainability",
    options: [
      "Research & Development (R&D)",
      "Sustainability & ESG (Environmental, Social, Governance)"
    ]
  }
];

export const BUSINESS_MODEL_GROUPS = [
  {
    label: 'Traditional Commerce',
    options: [
      'Product Sales', 'Wholesale', 'Retail', 'Direct-to-Consumer (DTC)', 'Dropshipping'
    ]
  },
  {
    label: 'Subscription-Based',
    options: [
      'Subscription', 'Subscription Services', 'Freemium', 'Hybrid Subscription + One-Time Sales', 'Freemium + Advertising'
    ]
  },
  {
    label: 'Service-Oriented',
    options: [
      'Service Provider', 'On-Demand Services', 'Managed Services', 'SaaS + Consulting'
    ]
  },
  {
    label: 'Platform & Marketplace',
    options: [
      'Marketplace', 'Platform as a Service (PaaS)', 'Software as a Service (SaaS)', 'Marketplace + Advertising'
    ]
  },
  {
    label: 'Innovative & Emerging',
    options: [
      'Sharing Economy', 'Network Effect', 'Crowdsourcing', 'Circular Economy', 'Data Monetization', 'Outcome-Based'
    ]
  },
  {
    label: 'Advertising & Commission',
    options: [
      'Advertising', 'Commission-Based', 'Affiliate Marketing'
    ]
  },
  {
    label: 'Licensing & Franchising',
    options: [
      'Licensing', 'Franchising', 'Franchise Royalties', 'Franchise + Licensing'
    ]
  },
  {
    label: 'Specialized Models',
    options: [
      'Product as a Service (PaaS)', 'Bundling', 'Razor and Blades', 'Usage-Based'
    ]
  }
];

export type BusinessOptionGroup = {
  label: string;
  options: string[];
};

export type BusinessOptionsResponse = {
  business_model_groups: BusinessOptionGroup[];
  business_horizontal_groups: BusinessOptionGroup[];
  business_vertical_groups: BusinessOptionGroup[];
};

export async function fetchBusinessOptions(): Promise<BusinessOptionsResponse> {
  const res = await fetch('/meta/business-options');
  if (!res.ok) throw new Error('Failed to fetch business options');
  return res.json();
} 