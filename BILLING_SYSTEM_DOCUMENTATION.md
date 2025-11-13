# CRM Billing System Documentation

## Overview

The CRM Billing System is designed to handle subscription management and payments for the CRM platform. It integrates with Square payment gateway to process payments and manage subscriptions.

## Features

- **Single Plan System**: One comprehensive plan that includes all features
- **14-Day Free Trial**: All new companies get a 14-day free trial
- **Square Payment Integration**: Secure payment processing through Square
- **Subscription Management**: Create, view, update, and cancel subscriptions
- **Role-Based Access Control**: Different permissions for different user roles
- **Invoice Management**: Generate and track invoices
- **Payment Tracking**: Track all payment transactions

## Subscription Plan Details

As per client requirements, there is only one plan:

- **Plan Name**: Enterprise Plan
- **Price**: $99.99/month
- **Features**: All CRM features included
- **Trial Period**: 14 days
- **Users**: Unlimited

## Role-Based Permissions

The billing system implements the following permissions:

- **MANAGE_BILLING**: Super Admin only - Full control over billing system
- **VIEW_BILLING**: Company Admin - View company's billing information

## API Endpoints

### Subscription Management

- `POST /api/billing/companies/{company_id}/subscription`: Create a subscription for a company
- `GET /api/billing/companies/{company_id}/subscription`: Get company subscription details
- `POST /api/billing/companies/{company_id}/subscription/cancel`: Cancel company subscription
- `POST /api/billing/companies/{company_id}/subscription/activate`: Activate company subscription after trial

### Payment Methods

- `POST /api/billing/companies/{company_id}/payment-methods`: Add a payment method to a company

### Invoices

- `GET /api/billing/companies/{company_id}/invoices`: List all invoices for a company
- `GET /api/billing/invoices/{invoice_id}`: Get invoice details

### Payments

- `GET /api/billing/companies/{company_id}/payments`: List all payments for a company

### Trial Management

- `POST /api/billing/companies/{company_id}/trial/extend`: Extend company trial period (Super Admin only)

### Dashboard

- `GET /api/billing/dashboard`: Get billing dashboard data (Super Admin only)

## Square Integration

The system integrates with Square for payment processing. The integration includes:

- Customer management in Square
- Card payment method creation and storage
- Payment processing
- Invoice generation
- Subscription management

## Database Models

### SubscriptionPlan

Represents the subscription plan available in the system.

### Subscription

Represents a company's subscription to a plan.

### Invoice

Represents an invoice generated for a subscription.

### Payment

Represents a payment made against an invoice.

## Implementation Details

### Environment Variables

The following environment variables are required:

- `SQUARE_ACCESS_TOKEN`: Square API access token
- `SQUARE_ENVIRONMENT`: Square environment (sandbox or production)

### Dependencies

- Square SDK: `square==28.0.0`

## Usage Examples

### Creating a Subscription

```python
# Create a subscription with a 14-day trial
subscription = await create_company_subscription(
    company_id=company_id,
    subscription_request=SubscriptionRequest(
        billing_cycle=BillingCycle.MONTHLY,
        auto_renew=True
    ),
    db=db,
    current_user=current_user
)
```

### Adding a Payment Method

```python
# Add a credit card payment method
payment_method = await add_payment_method(
    company_id=company_id,
    payment_method=PaymentMethodRequest(
        payment_method=PaymentMethod.CREDIT_CARD,
        card_details=CardDetails(
            card_number="4111111111111111",
            exp_month=12,
            exp_year=2025,
            cvc="123"
        )
    ),
    db=db,
    current_user=current_user
)
```

## Security Considerations

- Credit card numbers are never stored in the database, only the last 4 digits
- All payment processing is handled by Square
- Role-based access control ensures only authorized users can access billing information
- API endpoints are protected with authentication

## Future Enhancements

- Implement webhook handling for Square events
- Add support for multiple plans if needed in the future
- Implement automatic subscription renewal
- Add support for additional payment methods
