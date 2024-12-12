#!/bin/bash
set -e

ENV_FILE="$(pwd)/.env"

# Charger les variables d'environnement depuis le fichier .env
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo ".env file not found!"
    exit 1
fi

echo "Loading for setting up wordpress ..."
sleep 5

# Initialize attempt counter and set maximum attempts
attempt_counter_db=0
max_attempts=10

# Wait for the database to become available
until docker-compose exec db mysqladmin ping -h "db" -u $WORDPRESS_DB_USER -p$MYSQL_ROOT_PASSWORD --silent > /dev/null 2>&1; do
  attempt_counter_db=$((attempt_counter_db + 1))
  echo "Waiting for the database to become available... Attempt $attempt_counter_db of $max_attempts"
  
  if [ "$attempt_counter_db" -eq "$max_attempts" ]; then
    echo "Database did not become available after $max_attempts attempts. Exiting."
    exit 1
  fi

  # Adjust sleep as necessary
  sleep 20 || {
    echo "Sleep command failed. Exiting."
    exit 1
  } 
done

# Reset attempt counter for WordPress check
attempt_counter_wp=0

# Wait for WordPress to be accessible
until [ $(docker-compose exec -T wordpress curl --output /dev/null --silent --head --write-out '%{http_code}' --location http://wordpress) -eq 200 ]; do
    attempt_counter_wp=$((attempt_counter_wp + 1))
    echo "Waiting for WordPress to become available... Attempt $attempt_counter_wp of $max_attempts"
    
    if [ $attempt_counter_wp -eq $max_attempts ]; then
      echo "WordPress did not become available after $max_attempts attempts. Exiting."
      exit 1
    fi
    
    sleep 10 || {
    echo "Sleep command failed. Exiting."
    exit 1
  } 
done


ADDONS="%{ADDONS}"
# Execute all wp-cli commands in a single container session
docker-compose run --rm --user="root" wpcli bash -c "
    # Define a function to wrap wp-cli commands with --allow-root
    wp() {
        command wp \"\$@\" --allow-root
    }

    # Check if WordPress core files exist
    if [ -f '/var/www/html/wp-config.php' ]; then
        echo 'WordPress files detected.';
    else
        echo 'WordPress files not detected. Downloading WordPress...';
        wp core download --path='/var/www/html';
    fi

    # Check if WordPress is installed
    if wp core is-installed 2>/dev/null; then
        echo 'WordPress is already installed.';
    else
        echo 'Installing WordPress...'
        wp core install --path='/var/www/html' --url='http://$WP_HOST:$WP_PORT' --title=\"$PROJECT_NAME\" --admin_user=\"$WP_USER\" --admin_password=\"$WP_PASSWORD\" --admin_email=\"$WP_EMAIL\";
    fi

    # Language setup
    echo 'Setting up the language...';
    wp language core install \"$WP_LANGUAGE\";
    wp site switch-language \"$WP_LANGUAGE\";

    # Check if ADDONS is not empty
    if [ -z \"$ADDONS\" ]; then
        echo 'No plugins to install...';
    else
        echo 'Installing plugins...';
        wp plugin install $ADDONS --activate;
    fi

    # Check if JWT Authentication for WP REST API plugin is installed and set jwt secret key
    if wp plugin is-installed jwt-authentication-for-wp-rest-api; then
        wp config set JWT_AUTH_SECRET_KEY \"$SECRET_KEY\" --anchor='// (See also https://wordpress.stackexchange.com/a/152905/199287)' --placement=before;
    fi

    # Set the permalink structure
    echo 'Setting the permalink structure...'
    wp rewrite structure '/%postname%/';

    # Flush rewrite rules | The command above already flush the rewrite rules but it's good to have it here :)
    echo 'Flushing rewrite rules...'
    wp rewrite flush;
";

docker-compose exec wordpress bash -c "
    chown -R www-data:www-data /var/www/html;
    echo 'File permission changed';
    ";
