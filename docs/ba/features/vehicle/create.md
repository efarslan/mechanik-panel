# Feature: Create Vehicle

## 1. Overview
This feature allows users to register a new vehicle into the system under a specific business. The vehicle will later be used for tracking service history and operations.

---

## 2. User Story
As a service advisor,  
I want to register a new vehicle,  
So that I can track its service history and manage future service operations.

---

## 3. Preconditions
- User must be authenticated
- User must belong to a business (tenant)
- User must have permission to create vehicles

---

## 4. Inputs (Fields)
- Plate Number (required, unique within business)
- Brand (required)
- Model (required)
- Year (required)
- Fuel Type (required)
- Engine Size (required)
- Chasis No (optional)
- Owner Name (required)
- Owner Phone (optional)
- Notes (optional)

---

## 5. Business Rules
- Plate number must be unique within the same business
- Required fields must not be empty
- Year cannot be greater than current year
- Vehicle must be linked to a business ID

---

## 6. Process Flow
1. User opens "Create Vehicle" form
2. System displays input fields
3. User enters vehicle data
4. User submits form
5. System validates input:
   - Required fields check
   - Plate uniqueness check
6. If validation fails → show error message
7. If validation passes → save vehicle to database
8. System confirms success
9. Vehicle becomes visible in vehicle list

---

## 7. Acceptance Criteria
- User can access Create Vehicle form
- System validates all required fields
- Duplicate plate numbers are rejected
- Valid vehicle data is successfully saved
- After creation, vehicle appears in listing page

---

## 8. Edge Cases
- Duplicate plate number entered
- Missing required fields
- Invalid year value
- Database failure during save
- User loses connection during submission

---

## 9. Postconditions
- Vehicle is stored in database
- Vehicle is associated with correct business
- Vehicle is available for service tracking
