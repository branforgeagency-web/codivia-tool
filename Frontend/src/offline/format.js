/* CODIVIA offline — fill a label template from the server ("Draft saved {time}") with values. */
export const fillLabel = (template, values = {}) => String(template || '').replace(/\{(\w+)\}/g, (_, k) => (values[k] != null ? values[k] : ''));

export const clockTime = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
