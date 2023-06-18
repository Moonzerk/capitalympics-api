-- Init table users
CREATE TABLE IF NOT EXISTS users (
  id INT(11) NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  level INT(11) NOT NULL DEFAULT 0,
  last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Init table user_scores
CREATE TABLE IF NOT EXISTS user_scores (
  user_id INT(11) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  country_code VARCHAR(3) NOT NULL,
  succeeded_streak INT(11) NOT NULL DEFAULT 0,
  failed_streak INT(11) NOT NULL DEFAULT 0,
  succeeded INT(11) NOT NULL DEFAULT 0,
  failed INT(11) NOT NULL DEFAULT 0,
  level INT(11) NOT NULL DEFAULT -1,
  medium INT(11) NOT NULL DEFAULT 0,
  medium_streak INT(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, user_name, country_code),
  FOREIGN KEY (user_id, user_name) REFERENCES users (id, name) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Init table countries
CREATE TABLE IF NOT EXISTS countries (
  name VARCHAR(255) NOT NULL,
  official_name VARCHAR(255) NOT NULL,
  capital VARCHAR(255) NOT NULL,
  region VARCHAR(255) NOT NULL,
  subregion VARCHAR(255) NOT NULL,
  population INT(11) NOT NULL,
  google_maps_link VARCHAR(255) NOT NULL,
  flag VARCHAR(255) NOT NULL,
  alpha3Code VARCHAR(3) NOT NULL,
  PRIMARY KEY (alpha3Code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Init table currencies
CREATE TABLE IF NOT EXISTS currencies (
  country_code VARCHAR(3) NULL,
  currency_name VARCHAR(100) NULL,
  symbol VARCHAR(100) NULL,
  id INT(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (id),
  FOREIGN KEY (country_code) REFERENCES countries(alpha3Code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
