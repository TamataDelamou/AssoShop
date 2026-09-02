import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  CommunityService,
  CreateCommunityServicePayload,
  CreateServiceReviewPayload,
  ServiceReview,
} from "@/types/modules/market";

type ReviewDTO = Omit<ServiceReview, "created_at"> & {
  created_at: string;
};

type ServiceDTO = Omit<CommunityService, "created_at" | "reviews"> & {
  created_at: string;
  reviews: ReviewDTO[];
};

const SERVICES_URL = /^\/market\/services$/;
const REVIEWS_URL = /^\/market\/services\/([^/]+)\/reviews$/;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toResponse(data: unknown): AxiosResponse {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

const services: ServiceDTO[] = [
  {
    id: "srv-1",
    provider_name: "Mamadou Sow",
    provider_member: true,
    service_type: "plomberie",
    title: "Réparation plomberie à domicile",
    description:
      "Dépannage fuites, installation de sanitaires et entretien de plomberie.",
    price: 250000,
    currency: "GNF",
    country: "Guinée",
    city: "Conakry",
    rating: 4.7,
    reviews_count: 3,
    created_at: "2026-06-02T00:00:00.000Z",
    reviews: [
      {
        id: "srev-1",
        author_name: "Aminata Bah",
        rating: 5,
        comment: "Intervention rapide et travail propre.",
        solicited: true,
        created_at: "2026-06-20T00:00:00.000Z",
      },
      {
        id: "srev-2",
        author_name: "Ibrahima Camara",
        rating: 4,
        comment: "Bon service, tarif raisonnable.",
        solicited: true,
        created_at: "2026-07-11T00:00:00.000Z",
      },
      {
        id: "srev-3",
        author_name: "Fatou Diallo",
        rating: 5,
        comment: "Très professionnel.",
        solicited: true,
        created_at: "2026-08-03T00:00:00.000Z",
      },
    ],
  },
  {
    id: "srv-2",
    provider_name: "Fatoumata Diallo",
    provider_member: true,
    service_type: "couture",
    title: "Couture de tenues sur mesure",
    description:
      "Confection de tenues traditionnelles et modernes sur mesure.",
    price: 180000,
    currency: "GNF",
    country: "Guinée",
    city: "Conakry",
    rating: 4.5,
    reviews_count: 2,
    created_at: "2026-05-18T00:00:00.000Z",
    reviews: [
      {
        id: "srev-4",
        author_name: "Mariama Bah",
        rating: 4,
        comment: "Belle finition.",
        solicited: true,
        created_at: "2026-06-05T00:00:00.000Z",
      },
      {
        id: "srev-5",
        author_name: "Aïssatou Barry",
        rating: 5,
        comment: "Très satisfaite de ma robe.",
        solicited: true,
        created_at: "2026-07-22T00:00:00.000Z",
      },
    ],
  },
  {
    id: "srv-3",
    provider_name: "Ibrahima Camara",
    provider_member: false,
    service_type: "transport",
    title: "Transport de marchandises Conakry-Kindia",
    description:
      "Transport de marchandises en camionnette, aller-retour Conakry-Kindia.",
    price: 350000,
    currency: "GNF",
    country: "Guinée",
    city: "Conakry",
    rating: 4.3,
    reviews_count: 2,
    created_at: "2026-04-10T00:00:00.000Z",
    reviews: [
      {
        id: "srev-6",
        author_name: "Ousmane Condé",
        rating: 4,
        comment: "Livraison à l'heure.",
        solicited: true,
        created_at: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "srev-7",
        author_name: "Mamadou Sow",
        rating: 5,
        comment: "Chauffeur sérieux.",
        solicited: true,
        created_at: "2026-06-14T00:00:00.000Z",
      },
    ],
  },
  {
    id: "srv-4",
    provider_name: "Alpha Baldé",
    provider_member: true,
    service_type: "informatique",
    title: "Maintenance informatique et dépannage",
    description:
      "Installation, réparation et maintenance d'ordinateurs et réseaux.",
    price: 200000,
    currency: "GNF",
    country: "Guinée",
    city: "Labé",
    rating: 4.8,
    reviews_count: 3,
    created_at: "2026-03-22T00:00:00.000Z",
    reviews: [
      {
        id: "srev-8",
        author_name: "Sékou Camara",
        rating: 5,
        comment: "Compétent et réactif.",
        solicited: true,
        created_at: "2026-04-18T00:00:00.000Z",
      },
      {
        id: "srev-9",
        author_name: "Mariama Diallo",
        rating: 5,
        comment: "A résolu mon problème rapidement.",
        solicited: true,
        created_at: "2026-05-30T00:00:00.000Z",
      },
      {
        id: "srev-10",
        author_name: "Ibrahima Bah",
        rating: 4,
        comment: "Bon rapport qualité-prix.",
        solicited: true,
        created_at: "2026-07-08T00:00:00.000Z",
      },
    ],
  },
  {
    id: "srv-5",
    provider_name: "Aïssatou Barry",
    provider_member: true,
    service_type: "agriculture",
    title: "Conseil agricole et accompagnement",
    description:
      "Accompagnement technique des exploitations agricoles familiales.",
    price: 150000,
    currency: "GNF",
    country: "Guinée",
    city: "Kindia",
    rating: 4.6,
    reviews_count: 2,
    created_at: "2026-02-28T00:00:00.000Z",
    reviews: [
      {
        id: "srev-11",
        author_name: "Mamadou Barry",
        rating: 5,
        comment: "Conseils très utiles.",
        solicited: true,
        created_at: "2026-03-15T00:00:00.000Z",
      },
      {
        id: "srev-12",
        author_name: "Fatou Sow",
        rating: 4,
        comment: "Accompagnement sérieux.",
        solicited: true,
        created_at: "2026-04-20T00:00:00.000Z",
      },
    ],
  },
  {
    id: "srv-6",
    provider_name: "Ousmane Condé",
    provider_member: false,
    service_type: "formation",
    title: "Formation en bureautique",
    description:
      "Formation Word, Excel et initiation à l'informatique pour débutants.",
    price: 120000,
    currency: "GNF",
    country: "Guinée",
    city: "Conakry",
    rating: 4.4,
    reviews_count: 1,
    created_at: "2026-01-12T00:00:00.000Z",
    reviews: [
      {
        id: "srev-13",
        author_name: "Mariama Camara",
        rating: 4,
        comment: "Formateur pédagogue.",
        solicited: true,
        created_at: "2026-02-02T00:00:00.000Z",
      },
    ],
  },
];

function createService(config: InternalAxiosRequestConfig): ServiceDTO | null {
  const payload = (config.data ?? {}) as CreateCommunityServicePayload;
  if (!payload.title?.trim() || !payload.provider_name?.trim()) return null;

  const record: ServiceDTO = {
    id: `srv-${Date.now()}`,
    provider_name: payload.provider_name,
    provider_member: false,
    service_type: payload.service_type,
    title: payload.title,
    description: payload.description,
    price: payload.price,
    currency: payload.currency,
    country: payload.country,
    city: payload.city,
    rating: 0,
    reviews_count: 0,
    created_at: new Date().toISOString(),
    reviews: [],
  };

  services.unshift(record);
  return clone(record);
}

// RG-M04 : seule une personne ayant sollicité le service peut l'évaluer.
function addReview(config: InternalAxiosRequestConfig): ReviewDTO | null {
  const match = config.url?.match(REVIEWS_URL);
  if (!match) return null;

  const payload = (config.data ?? {}) as CreateServiceReviewPayload;
  if (!payload.solicited) return null;

  const service = services.find((s) => s.id === match[1]);
  if (!service) return null;

  const review: ReviewDTO = {
    id: `srev-${Date.now()}`,
    author_name: payload.author_name,
    rating: payload.rating,
    comment: payload.comment,
    solicited: true,
    created_at: new Date().toISOString(),
  };

  service.reviews.push(review);
  service.reviews_count = service.reviews.length;
  service.rating =
    Math.round(
      (service.reviews.reduce((sum, r) => sum + r.rating, 0) /
        service.reviews.length) *
        10,
    ) / 10;

  return clone(review);
}

export function marketServicesMockAdapter(
  config: InternalAxiosRequestConfig,
): AxiosAdapter | null {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "get" && SERVICES_URL.test(url)) {
    return async () => toResponse(clone(services));
  }
  if (method === "post" && SERVICES_URL.test(url)) {
    return async (cfg) => toResponse(createService(cfg));
  }
  if (method === "post" && REVIEWS_URL.test(url)) {
    return async (cfg) => toResponse(addReview(cfg));
  }

  return null;
}
