import type { Lang } from "@/lib/i18n";
import type { EmailKind } from "./schedule";

/**
 * Default wording. The subject and the opening paragraph can be edited per dinner
 * in the admin; {name}, {number} and {topic} are filled in per recipient.
 */
type Copy = { subject: string; eyebrow: string; heading: string; intro: string };

const es: Record<EmailKind, Copy> = {
  speaker_confirmed: {
    subject: "Confirmado: Sobremesa No. {number}",
    eyebrow: "Speaker confirmado",
    heading: "Gracias, {name}.",
    intro: "Quedaste confirmado como speaker de Sobremesa No. {number}: {topic}. Una semana antes te mandamos todos los detalles: quién va a estar en la mesa y qué quieren escuchar los estudiantes.",
  },
  speaker_week: {
    subject: "La mesa está puesta: Sobremesa No. {number}",
    eyebrow: "Recordatorio para speakers",
    heading: "La mesa está puesta, {name}.",
    intro: "Gracias por sumarte. Aquí está quién va a estar en la mesa y qué les interesa escuchar a los estudiantes.",
  },
  speaker_day: {
    subject: "Mañana: Sobremesa No. {number}",
    eyebrow: "Mañana",
    heading: "Nos vemos mañana, {name}.",
    intro: "Te dejamos la dirección y la mesa final, por si algo cambió.",
  },
  speaker_after: {
    subject: "Gracias por Sobremesa No. {number}",
    eyebrow: "Gracias",
    heading: "Gracias, {name}.",
    intro: "Gracias por ser parte de Sobremesa No. {number}. Fue una noche especial y nos llevamos aprendizajes para cada mesa que viene.",
  },
  student_week: {
    subject: "Tienes lugar en Sobremesa No. {number}",
    eyebrow: "Tienes lugar",
    heading: "Tienes lugar, {name}.",
    intro: "Te elegimos para Sobremesa No. {number}: {topic}. Para apartar tu lugar, paga por Venmo y confírmalo en las próximas 48 horas.",
  },
  student_day: {
    subject: "Mañana: Sobremesa No. {number}",
    eyebrow: "Mañana",
    heading: "Nos vemos mañana, {name}.",
    intro: "Te dejamos la dirección. Si al final no puedes venir, avísanos hoy para darle tu lugar a alguien de la lista de espera.",
  },
  student_after: {
    subject: "Gracias por venir a Sobremesa No. {number}",
    eyebrow: "Gracias",
    heading: "Gracias, {name}.",
    intro: "Gracias por sentarte con nosotros en Sobremesa No. {number}. Ojalá te hayas llevado una conversación y una relación nuevas.",
  },
};

const en: Record<EmailKind, Copy> = {
  speaker_confirmed: {
    subject: "You're confirmed: Sobremesa No. {number}",
    eyebrow: "Speaker confirmed",
    heading: "Thank you, {name}.",
    intro: "You're confirmed as a speaker for Sobremesa No. {number}: {topic}. A week before, we'll send you the full details: who will be at the table and what the students want to hear.",
  },
  speaker_week: {
    subject: "The table is set: Sobremesa No. {number}",
    eyebrow: "Speaker reminder",
    heading: "The table is set, {name}.",
    intro: "Thank you for joining us. Here is who will be at the table and what the students are curious about.",
  },
  speaker_day: {
    subject: "Tomorrow: Sobremesa No. {number}",
    eyebrow: "Tomorrow",
    heading: "See you tomorrow, {name}.",
    intro: "Here's the address and the final table, in case anything changed.",
  },
  speaker_after: {
    subject: "Thank you for Sobremesa No. {number}",
    eyebrow: "Thank you",
    heading: "Thank you, {name}.",
    intro: "Thank you for being part of Sobremesa No. {number}. It was a special night, and we took away lessons we will carry into every table after this one.",
  },
  student_week: {
    subject: "You're in: Sobremesa No. {number}",
    eyebrow: "You're in",
    heading: "You're in, {name}.",
    intro: "You have a seat at Sobremesa No. {number}: {topic}. To hold it, please pay by Venmo and confirm within 48 hours.",
  },
  student_day: {
    subject: "Tomorrow: Sobremesa No. {number}",
    eyebrow: "Tomorrow",
    heading: "See you tomorrow, {name}.",
    intro: "Here's the address. If you can no longer make it, let us know today so we can offer your seat to someone on the waitlist.",
  },
  student_after: {
    subject: "Thank you for coming to Sobremesa No. {number}",
    eyebrow: "Thank you",
    heading: "Thank you, {name}.",
    intro: "Thank you for joining us at Sobremesa No. {number}. We hope you left with a new conversation and a new connection.",
  },
};

export const EMAIL_COPY: Record<Lang, Record<EmailKind, Copy>> = { es, en };

/** Labels shared by every email. */
export const EMAIL_LABELS = {
  es: {
    when: "Cuándo", where: "Dónde", openMaps: "Abrir en Maps", addCalendar: "Agregar al calendario",
    whereLater: "Te mandamos la dirección un día antes.",
    hear: "Lo que los estudiantes quieren escuchar",
    fellow: "Los otros speakers",
    students: (n: number) => `Los ${n} estudiantes`, profile: "Perfil", viewProfile: "Ver perfil",
    year: (y: string) => (y === "1" ? "MBA de primer año" : "MBA de segundo año"),
    pay: "Pago", payAmount: (p: number) => `$${p} USD por Venmo`, payButton: "Pagar por Venmo",
    payNote: (h: string, note: string) => `A @${h}, con la nota “${note}”.`,
    unpaid: "Todavía no vemos tu pago", confirm: "Confirmar mi lugar",
    confirmNote: "Confírmalo aquí y cuéntanos si tienes alguna restricción alimentaria.",
    photos: "La noche", seeMore: "Ver todas las fotos",
    feedback: "Dos minutos de feedback",
    feedbackIntro: "Si tienes un minuto, nos encantaría saber cómo te fue. Nos ayuda a darle forma a las próximas cenas.",
    feedbackButton: "Compartir feedback",
    whatsapp: "Sigamos en contacto",
    whatsappIntro: "Armamos una comunidad de WhatsApp para los que han estado en la mesa: speakers y estudiantes.",
    whatsappButton: "Unirme al WhatsApp",
    questions: "Si tienes cualquier pregunta, responde a este correo.",
    signBefore: "Nos vemos en la mesa,", signAfter: "Con gratitud,", signers: "Daniela y Tomás",
    more: "Más sobre Sobremesa Dinners:",
  },
  en: {
    when: "When", where: "Where", openMaps: "Open in Maps", addCalendar: "Add to calendar",
    whereLater: "We'll send you the address the day before.",
    hear: "What the students want to hear",
    fellow: "Your fellow speakers",
    students: (n: number) => `The ${n} students`, profile: "Profile", viewProfile: "View profile",
    year: (y: string) => (y === "1" ? "1st-year MBA" : "2nd-year MBA"),
    pay: "Payment", payAmount: (p: number) => `$${p} USD by Venmo`, payButton: "Pay with Venmo",
    payNote: (h: string, note: string) => `To @${h}, with the note “${note}”.`,
    unpaid: "We haven't seen your payment yet", confirm: "Confirm my seat",
    confirmNote: "Confirm here and tell us about any dietary restrictions.",
    photos: "The night", seeMore: "See all the photos",
    feedback: "Two minutes of feedback",
    feedbackIntro: "If you have a minute, we would love to hear how it went for you. It helps us shape the next dinners.",
    feedbackButton: "Share your feedback",
    whatsapp: "Let's keep in touch",
    whatsappIntro: "We started a WhatsApp community for everyone who has been at the table: speakers and students.",
    whatsappButton: "Join the WhatsApp",
    questions: "If you have any questions, just reply to this email.",
    signBefore: "See you at the table,", signAfter: "With gratitude,", signers: "Daniela and Tomás",
    more: "More about Sobremesa Dinners:",
  },
} as const;
