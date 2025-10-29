# Prevent Double Submission Pattern

## Problem
Users can click submit buttons multiple times, creating duplicate records (deals, contacts, activities, etc.)

## Solution
Use the `useSubmitOnce` hook to prevent multiple submissions.

## Implementation Pattern

### 1. Import the Hook
```typescript
import { useSubmitOnce } from '../hooks/useSubmitOnce';
```

### 2. Wrap Your Submit Handler
```typescript
// BEFORE:
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await api.createRecord(data);
  toast.success('Created!');
};

// AFTER:
const [isSubmitting, handleSubmit] = useSubmitOnce(async (e: React.FormEvent) => {
  e.preventDefault();
  await api.createRecord(data);
  toast.success('Created!');
});
```

### 3. Update Submit Button
```typescript
<button
  type="submit"
  disabled={isSubmitting}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isSubmitting ? 'Creating...' : 'Create'}
</button>
```

## Files That Need This Fix

### High Priority (Create Forms)
- [x] `frontend/src/pages/Deals.tsx` - handleAddDeal ✅
- [ ] `frontend/src/pages/Contacts.tsx` - handleAddContact
- [ ] `frontend/src/pages/Activities.tsx` - handleAddActivity
- [ ] `frontend/src/pages/Quotes.tsx` - handleAddQuote
- [ ] `frontend/src/pages/Files.tsx` - handleUpload
- [ ] `frontend/src/pages/Workflows.tsx` - handleAddWorkflow
- [ ] `frontend/src/pages/PipelineSettings.tsx` - handleAddStage
- [ ] `frontend/src/pages/SMSTemplates.tsx` - handleAddTemplate
- [ ] `frontend/src/pages/ScheduledSMS.tsx` - handleScheduleSMS

### Medium Priority (Edit Forms)
- [ ] `frontend/src/pages/Deals.tsx` - handleUpdateDeal
- [ ] `frontend/src/pages/Contacts.tsx` - handleUpdateContact
- [ ] `frontend/src/pages/Profile.tsx` - handleSave
- [ ] `frontend/src/pages/Settings.tsx` - handleSaveSettings

### Low Priority (Auth Forms)
- [ ] `frontend/src/pages/auth/Login.tsx` - handleLogin
- [ ] `frontend/src/pages/auth/Register.tsx` - handleRegister
- [ ] `frontend/src/pages/auth/ForgotPassword.tsx` - handleSubmit

## Testing Checklist

For each form:
1. ✅ Click submit button rapidly multiple times
2. ✅ Verify only ONE record is created
3. ✅ Button shows "Creating..." text while submitting
4. ✅ Button is disabled during submission
5. ✅ Button re-enables after success/failure

## Example: Deals.tsx (COMPLETED)

```typescript
// 1. Import
import { useSubmitOnce } from '../hooks/useSubmitOnce';

// 2. Wrap handler
const [isSubmitting, handleAddDeal] = useSubmitOnce(async (e: React.FormEvent) => {
  e.preventDefault();
  // ... validation ...
  await dealsService.createDeal(data);
  toast.success('Deal created successfully!');
  // ... cleanup ...
});

// 3. Update button
<button
  type="submit"
  disabled={isSubmitting}
  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isSubmitting ? 'Creating...' : 'Create Deal'}
</button>
```

## Notes

- The hook automatically handles try/catch and resets state
- Works with async functions
- Prevents submission if already submitting
- No need to manually manage loading state
- Button styling automatically shows disabled state

## Next Steps

Apply this pattern to all forms listed above, starting with high-priority create forms.
