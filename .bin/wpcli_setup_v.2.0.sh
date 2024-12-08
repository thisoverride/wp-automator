#!/bin/bash
set -e  # Arrêter le script en cas d'erreur

# Définition des variables existantes
ADDONS=(%{ADDONS})
WP_PATH='/var/www/html'

# Fonction wrapper pour wp-cli avec --allow-root
wp() {
    command wp "$@" --allow-root
}

# Vérification des variables obligatoires
REQUIRED_VARS=("WORDPRESS_DB_HOST" "WORDPRESS_DB_NAME" "WORDPRESS_DB_USER" "WORDPRESS_DB_PASSWORD" "WP_HOST" "WP_PORT" "PROJECT_NAME" "WP_USER" "WP_PASSWORD" "WP_EMAIL" "WP_LANGUAGE")
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo "Error: Environment variable '$VAR' is not set."
        exit 1
    fi
done

# Vérification et installation de WordPress
if ! wp core is-installed --path="${WP_PATH}" 2>/dev/null; then
    echo 'WordPress files not detected. Downloading WordPress...'
    wp core download --path="${WP_PATH}"
    
    echo 'Creating wp-config.php...'
    wp core config \
        --dbhost="${WORDPRESS_DB_HOST}" \
        --dbname="${WORDPRESS_DB_NAME}" \
        --dbuser="${WORDPRESS_DB_USER}" \
        --dbpass="${WORDPRESS_DB_PASSWORD}"
    
    echo 'Installing WordPress...'
    wp core install \
        --path="${WP_PATH}" \
        --url="http://${WP_HOST}:${WP_PORT}" \
        --title="${PROJECT_NAME}" \
        --admin_user="${WP_USER}" \
        --admin_password="${WP_PASSWORD}" \
        --admin_email="${WP_EMAIL}"
else
    echo 'WordPress is already installed.'
fi

# Configuration de la langue
echo 'Setting up the language...'
wp language core install "${WP_LANGUAGE}"
wp site switch-language "${WP_LANGUAGE}"

# Installation des plugins
if [ -n "${ADDONS}" ]; then
echo 'Checking and installing plugins...'
    for PLUGIN in "${ADDONS[@]}"; do
        if wp plugin is-installed "${PLUGIN}"; then
            echo "Plugin '${PLUGIN}' is already installed."
            if ! wp plugin is-active "${PLUGIN}"; then
                echo "Activating plugin '${PLUGIN}'..."
                wp plugin activate "${PLUGIN}"
            fi
        else
            echo "Installing and activating plugin '${PLUGIN}'..."
            wp plugin install "${PLUGIN}" --activate || echo "Warning: Failed to install plugin '${PLUGIN}'."
        fi
    done
else
    echo 'No plugins specified for installation.'
fi

# Configuration JWT si le plugin est installé
if wp plugin is-installed jwt-authentication-for-wp-rest-api; then
    echo 'Configuring JWT plugin...'
    wp config set JWT_AUTH_SECRET_KEY "${SECRET_KEY}" \
        --anchor='/**#@-*/' \
        --placement=before
else
    echo 'JWT plugin not installed. Skipping JWT configuration.'
fi

# Configuration des permaliens
echo 'Setting the permalink structure...'
wp rewrite structure '/%postname%/'
wp rewrite flush

# Changement des permissions
echo 'Changing file permissions...'
chown -R www-data:www-data "${WP_PATH}"

echo "WordPress setup completed successfully!"
