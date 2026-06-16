CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE allotment_status_enum AS ENUM ('Awaited', 'Allotted', 'Not-Allotted', 'Not-Applied');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE pan_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    pan_no VARCHAR(10) NOT NULL,
    dob DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_user FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
    
    
    CONSTRAINT unique_user_pan UNIQUE (parent_id, pan_no)
);

CREATE TABLE ipos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL, 
    value VARCHAR(255) NOT NULL,       
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE 

CREATE TABLE allotment_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipo_id UUID NOT NULL,
    pan_num VARCHAR(10) NOT NULL,
    status allotment_status_enum DEFAULT 'Awaited' NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_ipo FOREIGN KEY (ipo_id) REFERENCES ipos(id) ON DELETE CASCADE,
    
    CONSTRAINT unique_ipo_pan_result UNIQUE (ipo_id, pan_num)
);

CREATE INDEX idx_allotment_lookup ON allotment_status(ipo_id, pan_num);

CREATE INDEX idx_pan_lookup ON pan_table(parent_id, pan_no);