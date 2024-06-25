#!/bin/bash
echo "Loading..."
sleep 5

# Initialize attempt counter and set maximum attempts
attempt_counter_db=0
max_attempts=10

# Wait for the database to become available
until docker-compose exec db mysqladmin ping -h "db" -u root -p%{MYSQL_ROOT_PASSWORD} --silent > /dev/null 2>&1; do
  attempt_counter_db=$((attempt_counter_db + 1))
  echo "Waiting for the database to become available... Attempt $attempt_counter_db of $max_attempts"
  
  if [ $attempt_counter_db -eq $max_attempts ]; then
    echo "Database did not become available after $max_attempts attempts. Exiting."
    exit 1
  fi
  
  sleep 10 # Adjust sleep as necessary
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
    
    sleep 2
done
# Execute all wp-cli commands in a single container session
docker-compose run --rm --user="root" wpcli bash -c "

# Check if WordPress core files exist
if [ -f '/var/www/html/wp-config.php' ]; then
    echo 'WordPress files detected.'
else
    echo 'WordPress files not detected. Downloading WordPress...'
    wp core download --path='/var/www/html' --allow-root;
fi

# Check if WordPress is installed
if wp core is-installed --allow-root 2>/dev/null; then
  echo 'WordPress is already installed.'
else
  echo 'Installing WordPress...'
  wp core install --path='/var/www/html' --url='http://%{WP_HOST}:%{WP_PORT}' --title='%{WP_PROJECT_NAME}' --admin_user='%{WP_USER}' --admin_password='%{WP_PASSWORD}' --admin_email='%{WP_EMAIL}' --allow-root;
fi

# Install and activate the WooCommerce plugin
echo 'Install addons...'
wp plugin install %{ADDONS} --activate --allow-root;


# Set the permalink structure
echo 'Setting the permalink structure...'
wp rewrite structure '/%postname%/' --allow-root;

# Flush rewrite rules | The command bellow already flush the rewrite rules but it's good to have it here :)
echo 'Flushing rewrite rules...'
wp rewrite flush --allow-root;
"

# Change the owner of the files
docker-compose exec wordpress chown -R www-data:www-data /var/www/html
echo 'File permission changed'