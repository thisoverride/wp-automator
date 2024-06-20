#!/bin/bash
echo "Loading..."
sleep 10

# Wait for the MYSQL database to be accessible
until docker-compose exec db mysqladmin ping -h "db" --silent; do
  echo "Waiting for the database to become available..."
  sleep 5
done

# Wait for WordPress to be accessible
until [ $(docker-compose exec -T wordpress curl --output /dev/null --silent --head --write-out '%{http_code}' --location http://wordpress) -eq 200 ]; do
    echo 'Waiting for WordPress to become available...'
    sleep 2
done

# Execute all wp-cli commands in a single container session
docker-compose run --rm --user="root" wpcli bash -c "
# Check if WordPress is installed, if not, download it
if ! wp core is-installed --allow-root 2>/dev/null; then
    echo 'Wordpress not installed. Downloading WordPress...'
    wp core download --path='/var/www/html' --allow-root;
fi

# Install WordPress
echo 'Installing WordPress...'
wp core install --path='/var/www/html' --url='http://%{WP_HOST}:%{WP_PORT}' --title='%{WP_PROJECT_NAME}' --admin_user='%{WP_USER}' --admin_password='%{WP_PASSWORD}' --admin_email='%{WP_EMAIL}' --allow-root;

# Update the option to allow user registration
echo 'Allowing user registration...'
wp option update users_can_register 1 --allow-root;

# Install and activate the WooCommerce plugin
echo 'Installing WooCommerce...'
wp plugin install woocommerce --activate --allow-root;

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