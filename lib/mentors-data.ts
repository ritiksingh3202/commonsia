import { MENTOR_PAGE_HERO_ASSETS } from "@/lib/mentor-page-assets";

export type Mentor = {
  id: string;
  name: string;
  role: string;
  shortBio: string;
  detail: string;
  tags: string[];
  slot: string;
  image: string;
  /** When set, logged-in students can open a real DM to this User id via `/messages`. */
  linkedUserId?: string | null;
};

export const mentors: Mentor[] = [
  {
    id: "1",
    name: "Dr. Arjun Mehta",
    role: "Assistant Professor, CEPT",
    shortBio:
      "18+ years building products, cities, and sustainable urban systems across India and Southeast Asia.",
    detail:
      "Do you want to design livable cities and public spaces? I mentor students in urban morphology, mobility planning, and public realm design.",
    tags: [
      "Urban Design",
      "Urban Planning",
      "Universal Design",
      "Real Estate",
      "Interior Design",
      "Ekistics",
    ],
    slot: "Next Available Slot : Wednesday 6:00 PM - 6:30 PM",
    image: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
  {
    id: "2",
    name: "Dr. Arjun Mehta",
    role: "Assistant Professor, CEPT",
    shortBio:
      "18+ years building products, cities, and sustainable urban systems across India and Southeast Asia.",
    detail:
      "Do you want to design livable cities and public spaces? I mentor students in urban morphology, mobility planning, and public realm design.",
    tags: [
      "Urban Design",
      "Urban Planning",
      "Universal Design",
      "Real Estate",
      "Interior Design",
      "Ekistics",
    ],
    slot: "Next Available Slot : Wednesday 6:00 PM - 6:30 PM",
    image: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
  {
    id: "3",
    name: "Dr. Arjun Mehta",
    role: "Assistant Professor, CEPT",
    shortBio:
      "18+ years building products, cities, and sustainable urban systems across India and Southeast Asia.",
    detail:
      "Do you want to design livable cities and public spaces? I mentor students in urban morphology, mobility planning, and public realm design.",
    tags: [
      "Urban Design",
      "Urban Planning",
      "Universal Design",
      "Real Estate",
      "Interior Design",
      "Ekistics",
    ],
    slot: "Next Available Slot : Wednesday 6:00 PM - 6:30 PM",
    image: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
  {
    id: "4",
    name: "Dr. Arjun Mehta",
    role: "Assistant Professor, CEPT",
    shortBio:
      "18+ years building products, cities, and sustainable urban systems across India and Southeast Asia.",
    detail:
      "Do you want to design livable cities and public spaces? I mentor students in urban morphology, mobility planning, and public realm design.",
    tags: [
      "Urban Design",
      "Urban Planning",
      "Universal Design",
      "Real Estate",
      "Interior Design",
      "Ekistics",
    ],
    slot: "Next Available Slot : Wednesday 6:00 PM - 6:30 PM",
    image: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
  {
    id: "5",
    name: "Dr. Arjun Mehta",
    role: "Assistant Professor, CEPT",
    shortBio:
      "18+ years building products, cities, and sustainable urban systems across India and Southeast Asia.",
    detail:
      "Do you want to design livable cities and public spaces? I mentor students in urban morphology, mobility planning, and public realm design.",
    tags: [
      "Urban Design",
      "Urban Planning",
      "Universal Design",
      "Real Estate",
      "Interior Design",
      "Ekistics",
    ],
    slot: "Next Available Slot : Wednesday 6:00 PM - 6:30 PM",
    image: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
  {
    id: "6",
    name: "Dr. Arjun Mehta",
    role: "Assistant Professor, CEPT",
    shortBio:
      "18+ years building products, cities, and sustainable urban systems across India and Southeast Asia.",
    detail:
      "Do you want to design livable cities and public spaces? I mentor students in urban morphology, mobility planning, and public realm design.",
    tags: [
      "Urban Design",
      "Urban Planning",
      "Universal Design",
      "Real Estate",
      "Interior Design",
      "Ekistics",
    ],
    slot: "Next Available Slot : Wednesday 6:00 PM - 6:30 PM",
    image: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
  {
    id: "7",
    name: "Dr. Arjun Mehta",
    role: "Assistant Professor, CEPT",
    shortBio:
      "18+ years building products, cities, and sustainable urban systems across India and Southeast Asia.",
    detail:
      "Do you want to design livable cities and public spaces? I mentor students in urban morphology, mobility planning, and public realm design.",
    tags: [
      "Urban Design",
      "Urban Planning",
      "Universal Design",
      "Real Estate",
      "Interior Design",
      "Ekistics",
    ],
    slot: "Next Available Slot : Wednesday 6:00 PM - 6:30 PM",
    image: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
  {
    id: "8",
    name: "Dr. Arjun Mehta",
    role: "Assistant Professor, CEPT",
    shortBio:
      "18+ years building products, cities, and sustainable urban systems across India and Southeast Asia.",
    detail:
      "Do you want to design livable cities and public spaces? I mentor students in urban morphology, mobility planning, and public realm design.",
    tags: [
      "Urban Design",
      "Urban Planning",
      "Universal Design",
      "Real Estate",
      "Interior Design",
      "Ekistics",
    ],
    slot: "Next Available Slot : Wednesday 6:00 PM - 6:30 PM",
    image: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
  {
    id: "9",
    name: "Dr. Arjun Mehta",
    role: "Assistant Professor, CEPT",
    shortBio:
      "18+ years building products, cities, and sustainable urban systems across India and Southeast Asia.",
    detail:
      "Do you want to design livable cities and public spaces? I mentor students in urban morphology, mobility planning, and public realm design.",
    tags: [
      "Urban Design",
      "Urban Planning",
      "Universal Design",
      "Real Estate",
      "Interior Design",
      "Ekistics",
    ],
    slot: "Next Available Slot : Wednesday 6:00 PM - 6:30 PM",
    image: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
  {
    id: "10",
    name: "Dr. Arjun Mehta",
    role: "Assistant Professor, CEPT",
    shortBio:
      "18+ years building products, cities, and sustainable urban systems across India and Southeast Asia.",
    detail:
      "Do you want to design livable cities and public spaces? I mentor students in urban morphology, mobility planning, and public realm design.",
    tags: [
      "Urban Design",
      "Urban Planning",
      "Universal Design",
      "Real Estate",
      "Interior Design",
      "Ekistics",
    ],
    slot: "Next Available Slot : Wednesday 6:00 PM - 6:30 PM",
    image: MENTOR_PAGE_HERO_ASSETS.mentorPhoto,
  },
];

export function getMentorById(id: string): Mentor | undefined {
  return mentors.find((m) => m.id === id);
}
