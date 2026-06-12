export function getQuoteAcceptCopy(locale: "en" | "es") {
  if (locale === "es") {
    return {
      loading: "Cargando cotización…",
      invalid: "Este enlace de cotización no es válido o ha expirado.",
      quoteLabel: "Cotización",
      ref: "Ref.",
      total: "Total",
      accept: "Aceptar cotización",
      decline: "Rechazar",
      name: "Nombre completo",
      email: "Correo electrónico",
      nameRequired: "El nombre es obligatorio.",
      emailRequired: "El correo electrónico es obligatorio.",
      disclaimer:
        "Al aceptar, confirma que ha revisado esta cotización y autoriza a proceder según los términos indicados. Esta aceptación electrónica es vinculante.",
      disclaimerAck: "He leído y acepto los términos anteriores.",
      accepted: "Gracias. Su aceptación fue registrada.",
      rejected: "Su respuesta fue registrada.",
      alreadyResponded: "Esta cotización ya fue respondida.",
      payNowTitle: "Pagar ahora",
      payNowHint: "Pague de forma segura con tarjeta. Recibirá un recibo por correo.",
      payNowCta: "Pagar con tarjeta",
      payNowLoading: "Redirigiendo…",
      paymentSuccess: "Pago recibido. Gracias — le enviaremos un recibo por correo.",
      paymentCancelled: "El pago fue cancelado. Puede intentarlo de nuevo cuando lo desee.",
      paymentReceived: "Pago recibido. Gracias.",
      paymentError: "No se pudo iniciar el pago. Inténtelo de nuevo.",
    };
  }

  return {
    loading: "Loading quote…",
    invalid: "This quote link is invalid or has expired.",
    quoteLabel: "Quote",
    ref: "Ref.",
    total: "Total",
    accept: "Accept quote",
    decline: "Decline",
    name: "Full name",
    email: "Email address",
    nameRequired: "Name is required.",
    emailRequired: "Email is required.",
    disclaimer:
      "By accepting, you confirm that you have reviewed this quote and authorize work to proceed under the stated terms. This electronic acceptance is binding.",
    disclaimerAck: "I have read and agree to the terms above.",
    accepted: "Thank you. Your acceptance was recorded.",
    rejected: "Your response was recorded.",
    alreadyResponded: "This quote has already been responded to.",
    payNowTitle: "Pay now",
    payNowHint: "Pay securely by card. You will receive a receipt by email.",
    payNowCta: "Pay with card",
    payNowLoading: "Redirecting…",
    paymentSuccess: "Payment received. Thank you — we will email your receipt shortly.",
    paymentCancelled: "Payment was cancelled. You can try again whenever you are ready.",
    paymentReceived: "Payment received. Thank you.",
    paymentError: "Could not start checkout. Please try again.",
  };
}
