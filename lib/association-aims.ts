import { Award, GraduationCap, HandCoins, Palette, PartyPopper, Scale, School, Users, type LucideIcon } from "lucide-react";

/**
 * The association's aims and objectives, shown as a grid on the home page.
 * Placeholder wording until the committee confirms the list from the constitution;
 * edit the text here (Bangla first, English below).
 */
export interface AssociationAim {
  icon: LucideIcon;
  bn: string;
  en: string;
}

export const ASSOCIATION_AIMS: AssociationAim[] = [
  {
    icon: Users,
    bn: "প্রাক্তন শিক্ষার্থীদের মধ্যে পারস্পরিক সম্পর্ক, যোগাযোগ ও ভ্রাতৃত্ববোধ গড়ে তোলা।",
    en: "Fellowship and lasting contact among former students of every batch.",
  },
  {
    icon: GraduationCap,
    bn: "দরিদ্র অথচ মেধাবী শিক্ষার্থীদের বৃত্তি ও শিক্ষা সহায়তা প্রদান।",
    en: "Scholarships and study support for deserving students in need.",
  },
  {
    icon: Palette,
    bn: "বিদ্যালয়ের শিক্ষার্থীদের জন্য সাহিত্য, সাংস্কৃতিক ও সামাজিক কর্মসূচি গ্রহণ।",
    en: "Literary, cultural and social programmes for the school's students.",
  },
  {
    icon: Award,
    bn: "মেধাবী শিক্ষার্থী, প্রবীণ প্রাক্তন শিক্ষার্থী ও শিক্ষকদের সম্মাননা।",
    en: "Honouring outstanding students, senior alumni and teachers.",
  },
  {
    icon: PartyPopper,
    bn: "প্রতিষ্ঠাবার্ষিকী উদ্‌যাপন ও নিয়মিত পুনর্মিলনী অনুষ্ঠান আয়োজন।",
    en: "Founding-day celebrations and regular reunions.",
  },
  {
    icon: Scale,
    bn: "সংগঠনের অরাজনৈতিক ও সর্বজনীন মর্যাদা অক্ষুণ্ন রাখা।",
    en: "Keeping the association non-political and open to all.",
  },
  {
    icon: HandCoins,
    bn: "কল্যাণমূলক কাজের জন্য কল্যাণ তহবিল গঠন।",
    en: "A welfare fund for members and families in hardship.",
  },
  {
    icon: School,
    bn: "প্রয়োজনে বিদ্যালয়, শিক্ষার্থী ও শিক্ষকদের সহায়তা ও সহযোগিতা প্রদান।",
    en: "Supporting the school, its students and teachers when needed.",
  },
];
