import Joi from 'joi';

const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&()_+[\]{};':"\\|,.<>/?-]).{8,}$/;
const noSpecialCharact = /^[a-zA-Z0-9_-]+$/; // Autorise uniquement les lettres, chiffres, underscores et tirets
const message = 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un caractère spécial et un nombre.';

const requestBodySchema = Joi.object({
  dirname: Joi.string().pattern(noSpecialCharact).required().messages({
    'string.pattern.base': 'Le nom du dossier ne doit pas contenir de caractères spéciaux.'
  }),
  username: Joi.string().pattern(noSpecialCharact).required().messages({
    'string.pattern.base': 'Le nom d\'utilisateur ne doit pas contenir de caractères spéciaux.'
  }),
  email: Joi.string().email().required(),
  wpPassword: Joi.string().pattern(passwordPattern).required().messages({'string.pattern.base': message}),
  mysqlRootPassword: Joi.string().pattern(passwordPattern).required().messages({'string.pattern.base': message}),
  mysqlUser: Joi.string().required(),
  mysqlPassword: Joi.string().pattern(passwordPattern).required().messages({'string.pattern.base': message}),
  mysqlPort: Joi.number().integer().min(1).max(65535).required(),
  wpPort: Joi.number().integer().min(1).max(65535).required(),
  wpHost: Joi.string().required(),
  wpProjectName: Joi.string().required(),
  nameApiKey: Joi.string().required(),
  rules: Joi.string().required()
});

export { requestBodySchema };
