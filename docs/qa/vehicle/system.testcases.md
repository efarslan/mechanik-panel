# QA Test Suite – Vehicle Module

---

## 1. Scope
This document covers end-to-end testing of the Vehicle Module, including:
- Vehicle Creation
- Vehicle Listing & Search
- Vehicle Detail View

---

## 2. Preconditions
- User is authenticated
- User belongs to a business (tenant)
- User has required permissions
- System contains test vehicle data

---

# 🚗 CREATE VEHICLE TESTS

## TC-CV-01 – Successful Vehicle Creation

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle List page

**Test Steps:**
1. Click "Add Vehicle" button
2. Enter valid vehicle information:
   - Plate number
   - Brand
   - Model
   - Year
   - Engine Size
   - Owner Name
3. Click "Save" button

**Test Data:**
- Plate: 34ABC123
- Brand: Toyota
- Model: Corolla
- Year: 2020
- Engine Size: 1.6
- Owner Name: Ali Veli

**Expected Result:**
- Vehicle is successfully created
- Success message/notification is displayed
- Newly created vehicle appears in Vehicle List

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Plate must be unique within the business

## TC-CV-02 – Missing Required Fields

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle List page

**Test Steps:**
1. Click "Add Vehicle" button
2. Leave required fields empty:
   - Plate number
   - Brand
   - Model
   - Year
   - Engine Size
3. Click "Save" button

**Test Data:**
- Plate: (empty)
- Brand: (empty)
- Model: (empty)
- Year: (empty)
- Engine Size: (empty)

**Expected Result:**
- System displays validation errors for all required fields
- Vehicle is NOT created
- User remains on Create Vehicle form
- Save action is blocked

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Each required field should show a specific validation message

## TC-CV-03 – Duplicate Plate Number

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle List page
- A vehicle with plate "34ABC123" already exists in the system

**Test Steps:**
1. Click "Add Vehicle" button
2. Enter vehicle information:
   - Plate: 34ABC123 (duplicate)
   - Brand: Toyota
   - Model: Corolla
3. Click "Save" button

**Test Data:**
- Existing Plate: 34ABC123
- New Entry Plate: 34ABC123

**Expected Result:**
- System displays validation error indicating duplicate plate
- Vehicle is NOT created
- User remains on Create Vehicle form
- Save action is blocked

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Plate must be unique within the same business (tenant-based validation)

## TC-CV-04 – Invalid Year

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle List page
- Current Year is 2026

**Test Steps:**
1. Click "Add Vehicle" button
2. Enter vehicle information:
   - Plate: 34ABC123
   - Brand: Toyota
   - Model: Corolla
   - Year: 2027 (future year)
3. Click "Save" button

**Test Data:**
- Current Year: 2026
- Entry Year: 2027

**Expected Result:**
- System displays validation error for invalid year input
- Error message indicates that year cannot be in the future
- Vehicle is NOT created
- User remains on Create Vehicle form
- Save action is blocked

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Year must not exceed current year
- Boundary testing should include:
  - Future year (2027)
  - Very old year (e.g., 1800)
  - Negative values
  - Non-numeric input
---

# 📋 VEHICLE LIST TESTS

## TC-VL-01 – List Vehicles Successfully

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle List page
- System contains multiple vehicles for the business

**Test Steps:**
1. Navigate to Vehicle Module
2. Open Vehicle List page
3. Wait for the list to load

**Test Data:**
- Business has at least 3 vehicles:
  - 34ABC123 – Toyota Corolla
  - 34KLM789 – Honda Civic
  - 06DEF456 – Renault Clio

**Expected Result:**
- Vehicle list is displayed successfully
- All vehicles belonging to the user’s business are listed
- Each vehicle entry shows correct information (plate, brand, model)
- No vehicles from other businesses are displayed
- List loads without errors

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Multi-tenant isolation must be enforced
- Data should match backend records

## TC-VL-02 – Search by Plate

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle List page
- System contains multiple vehicles for the business
- A vehicle with plate "34ABC123" exists

**Test Steps:**
1. Navigate to Vehicle Module
2. Open Vehicle List page
3. Wait for the list to load
4. Enter "34ABC123" into search input field
5. Trigger search (press Enter or click search button)

**Test Data:**
- Vehicles:
  - 34ABC123 – Toyota Corolla
  - 34XYZ789 – Honda Civic
  - 06DEF456 – Renault Clio

**Expected Result:**
- Vehicle list is filtered based on search input
- Only the vehicle with plate "34ABC123" is displayed
- No unrelated vehicles are shown
- Search operation completes without errors

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Search should be exact match for full plate input
- Behavior for partial input should be tested separately

## TC-VL-03 – Search by Brand/Model

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle List page
- System contains multiple vehicles with different brands and models

**Test Steps:**
1. Navigate to Vehicle Module
2. Open Vehicle List page
3. Wait for vehicles to load
4. Enter "Toyota" into search input field
5. Trigger search (press Enter or click search button)

**Test Data:**
- Vehicles:
  - 34ABC123 – Toyota Corolla
  - 34XYZ789 – Honda Civic
  - 06DEF456 – Toyota Yaris
  - 34JKL999 – Renault Clio

**Expected Result:**
- Vehicle list is filtered based on brand/model search input
- All vehicles matching "Toyota" are displayed
- Non-matching vehicles (e.g. Honda, Renault) are not displayed
- Search should support partial matching (if user enters "Toy", Toyota results should still appear)
- Search completes without errors

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Search should be case-insensitive (toyota = Toyota = TOYOTA)
- Both brand and model fields should be included in search scope
- Filtering should not affect unrelated modules

## TC-VL-04 – Empty State

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle List page
- System has no vehicles for the user’s business

**Test Steps:**
1. Navigate to Vehicle Module
2. Open Vehicle List page
3. Wait for data to load

**Test Data:**
- No vehicles exist for the current business

**Expected Result:**
- System displays empty state UI
- Message such as "No vehicles found" is shown
- No errors appear in console or UI
- User is still able to click "Add Vehicle" button

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Empty state should be visually distinct and user-friendly
- System should not display broken layout or loading loop

## TC-VL-05 – Unauthorized Access

**Preconditions:**
- User is NOT authenticated OR session is expired

**Test Steps:**
1. Attempt to access Vehicle List page directly via URL
2. Or navigate to Vehicle Module without valid session

**Test Data:**
- No valid authentication token present

**Expected Result:**
- User is redirected to login page OR
- System shows "Access Denied" message
- No vehicle data is exposed
- API calls are blocked with 401/403 response

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Must be enforced both frontend and backend
- Direct URL access must not bypass authentication

---

# 📊 VEHICLE DETAIL TESTS

## TC-VD-01 – View Vehicle Detail (With History)

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle List page
- System contains a vehicle with service history

**Test Steps:**
1. Navigate to Vehicle Module
2. Open Vehicle List page
3. Click on a vehicle that has service history
4. System navigates to Vehicle Detail page

**Test Data:**
- Vehicle:
  - Plate: 34ABC123
  - Brand: Toyota
  - Model: Corolla
- Service History:
  - Oil change – 10.01.2025
  - Brake replacement – 15.03.2025

**Expected Result:**
- Vehicle detail page is displayed correctly
- Vehicle basic information (plate, brand, model) is visible
- Service history list is displayed
- Each service record shows correct date and description
- No missing or mismatched data is shown

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Data consistency between list and detail must be verified
- Service history should be ordered logically (default newest first unless specified)

## TC-VD-02 – No Service History

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle List page
- System contains a vehicle with NO service history

**Test Steps:**
1. Click on a vehicle that has no service history
2. System navigates to Vehicle Detail page

**Test Data:**
- Vehicle:
  - Plate: 34ABC123
  - Brand: Toyota
  - Model: Corolla
- Service History: Empty

**Expected Result:**
- Vehicle detail page is displayed correctly
- Vehicle basic information (plate, brand, model) is visible
- Service history section is displayed as empty state
- Empty state message such as "No service history found" is shown
- No errors or broken UI components are visible

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Empty state must be consistent with UI design system
- Service history section should still exist (not hidden), only data is empty

## TC-VD-03 – Invalid Vehicle ID

**Preconditions:**
- User is authenticated
- User belongs to a business

**Test Steps:**
1. Navigate to Vehicle Detail page using an invalid or non-existent vehicle ID via URL
   - Example: `/vehicles/invalid-id-123`
2. Attempt to load the page

**Test Data:**
- Vehicle ID: invalid-id-123 (does not exist in system)

**Expected Result:**
- System returns "Not Found" (404) response OR equivalent error handling
- Vehicle detail page is not rendered with empty/invalid data
- User sees a proper error UI (e.g., "Vehicle not found")
- No system crash or broken UI occurs
- No unauthorized data is exposed

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Backend must validate vehicle ID existence
- Frontend must handle 404 gracefully
- Direct URL manipulation must not expose internal data

## TC-VD-04 – Unauthorized Access

**Preconditions:**
- User is NOT authenticated OR session token is expired
- System contains existing vehicles

**Test Steps:**
1. Attempt to access a vehicle detail page directly via URL
   - Example: `/vehicles/34ABC123`
2. Or attempt navigation from Vehicle List without valid session

**Test Data:**
- Vehicle ID: 34ABC123
- No valid authentication token

**Expected Result:**
- User is redirected to Login page OR
- System shows "Access Denied" message
- Vehicle detail data is NOT displayed
- API requests return 401/403 Unauthorized
- No sensitive vehicle data is exposed in UI or network response

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Authentication must be enforced both frontend and backend
- Direct URL access must not bypass security checks
- Session expiration must invalidate access immediately

## TC-VD-05 – Service History Sorting

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle Detail page
- Vehicle has multiple service history records with different dates

**Test Steps:**
1. Open Vehicle Detail page for a vehicle with service history
2. Scroll to Service History section
3. Observe the order of listed service records

**Test Data:**
- Service History:
  - Oil Change – 15.03.2025
  - Brake Replacement – 10.01.2025
  - Tire Change – 20.05.2025

**Expected Result:**
- Service history records are displayed in correct order
- Default sorting is newest to oldest (descending by date)
- Latest service (20.05.2025) appears at the top
- Oldest service appears at the bottom
- No inconsistent or unsorted ordering is shown

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Sorting must be based on actual timestamp, not string comparison
- Timezone handling must not break order

## TC-VD-06 – Large Service History Load

**Preconditions:**
- User is authenticated
- User belongs to a business
- User is on Vehicle Detail page
- Vehicle has a large number of service history records (e.g. 100+)

**Test Steps:**
1. Open Vehicle Detail page
2. Navigate to Service History section
3. Scroll through all records
4. Observe loading performance and UI responsiveness

**Test Data:**
- Service History: 100+ records (generated dataset)

**Expected Result:**
- Service history loads successfully without errors
- UI remains responsive during rendering
- No significant lag or freezing occurs
- All records are displayed correctly (pagination or lazy loading if implemented)
- No missing or duplicated entries

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Performance should remain acceptable under large dataset
- If pagination exists, it should function correctly

## TC-VD-07 – Data Consistency Check

**Preconditions:**
- User is authenticated
- User belongs to a business
- System contains at least one vehicle with service history
- User is on Vehicle List page

**Test Steps:**
1. Open Vehicle List page
2. Note vehicle summary data (plate, brand, model)
3. Open same vehicle in Vehicle Detail page
4. Compare data between list and detail views

**Test Data:**
- Vehicle:
  - Plate: 34ABC123
  - Brand: Toyota
  - Model: Corolla

**Expected Result:**
- Vehicle data in list view matches detail view exactly
- No discrepancies in plate, brand, or model fields
- Service history belongs only to correct vehicle
- No cross-vehicle data leakage occurs

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- This test validates backend consistency and data mapping integrity
- Critical for multi-module reliability

---

# 🔒 CROSS-MODULE TESTS

## TC-XM-01 – Navigation Flow

**Preconditions:**
- User is authenticated
- User belongs to a business
- System contains at least one vehicle

**Test Steps:**
1. Navigate to Vehicle Module
2. Open Vehicle List page
3. Click on any vehicle in the list
4. Observe navigation behavior

**Test Data:**
- Vehicle:
  - Plate: 34ABC123
  - Brand: Toyota
  - Model: Corolla

**Expected Result:**
- User is successfully navigated from Vehicle List to Vehicle Detail page
- Correct vehicle detail page is opened based on selected vehicle
- No page reload errors or broken routing occurs
- Browser URL reflects correct vehicle ID or identifier

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Navigation must preserve correct vehicle context
- Deep linking should work correctly

## TC-XM-02 – Data Integrity

**Preconditions:**
- User is authenticated
- User belongs to a business
- A vehicle is created successfully
- Vehicle has valid data stored in system

**Test Steps:**
1. Create a new vehicle via Create Vehicle flow
2. Navigate to Vehicle List page
3. Verify vehicle appears in list
4. Open Vehicle Detail page
5. Compare data between list and detail views

**Test Data:**
- Plate: 34ABC123
- Brand: Toyota
- Model: Corolla

**Expected Result:**
- Newly created vehicle appears in Vehicle List immediately or after refresh
- Vehicle data is consistent across List and Detail pages
- No missing or corrupted fields in either view
- Data matches exactly with stored backend record

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- This test validates end-to-end data persistence and mapping
- Critical for ensuring no frontend-backend mismatch

## TC-XM-03 – Permission Enforcement

**Preconditions:**
- User A belongs to Business A
- User B belongs to Business B
- System contains vehicles for both businesses

**Test Steps:**
1. Login as User A
2. Attempt to access a vehicle belonging to Business B via URL or API
   - Example: `/vehicles/vehicle-from-business-b`
3. Observe system response

**Test Data:**
- Business A Vehicle: 34ABC123
- Business B Vehicle: 99ZZZ999

**Expected Result:**
- User A cannot access vehicles belonging to Business B
- System returns 403 Forbidden or appropriate access denied response
- No data from Business B is exposed in UI or API
- Vehicle detail page is not rendered with unauthorized data

**Actual Result:**
(To be filled during execution)

**Status:**
Not Executed

**Notes:**
- Multi-tenant isolation must be strictly enforced at backend level
- Frontend security alone is not sufficient

---

# 📊 Test Coverage Summary

- Functional Testing ✔
- Negative Scenarios ✔
- Edge Cases ✔
- Security / Authorization ✔
- Performance (basic) ✔
- Data Consistency ✔

---

# 🧠 Notes

- These tests are **manual QA ready**
- Can be converted to automation later
- Designed for real-world service system behavior