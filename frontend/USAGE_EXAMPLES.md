# Usage Examples for Error Handling and Loading States

## 1. Using Error Handler

```typescript
import { handleApiError, withErrorHandler } from './utils/errorHandler';
import axios from 'axios';

// Example 1: Basic error handling
const fetchData = async () => {
  try {
    const response = await axios.get('/api/deals');
    return response.data;
  } catch (error) {
    handleApiError(error, {
      showToast: true,
      toastMessage: 'Failed to load deals',
      logToConsole: true
    });
  }
};

// Example 2: Using withErrorHandler wrapper
const fetchDataSimple = async () => {
  return await withErrorHandler(
    () => axios.get('/api/deals').then(res => res.data),
    { toastMessage: 'Failed to load deals' }
  );
};

// Example 3: Custom error callback
const deleteItem = async (id: string) => {
  await withErrorHandler(
    () => axios.delete(`/api/deals/${id}`),
    {
      toastMessage: 'Failed to delete deal',
      onError: (error) => {
        // Custom handling
        console.log('Deletion failed:', error);
        // Maybe refresh the list or rollback UI changes
      }
    }
  );
};
```

## 2. Using Loading Hook

```typescript
import { useLoading } from './hooks/useLoading';
import { LoadingSpinner, ButtonSpinner } from './components/LoadingSpinner';

function MyComponent() {
  const { isLoading, withLoading } = useLoading();

  const fetchData = async () => {
    const data = await withLoading(async () => {
      const response = await axios.get('/api/deals');
      return response.data;
    });
    
    if (data) {
      setDeals(data);
    }
  };

  return (
    <div>
      {isLoading ? (
        <LoadingSpinner message="Loading deals..." />
      ) : (
        <div>Your content here</div>
      )}
    </div>
  );
}
```

## 3. Complete Example - Combining Both

```typescript
import { useLoading } from './hooks/useLoading';
import { handleApiError } from './utils/errorHandler';
import { LoadingSpinner } from './components/LoadingSpinner';
import axios from 'axios';

function DealsPage() {
  const [deals, setDeals] = useState([]);
  const { isLoading, withLoading } = useLoading();

  const fetchDeals = async () => {
    try {
      const data = await withLoading(async () => {
        const response = await axios.get('/api/deals');
        return response.data;
      });
      
      if (data) {
        setDeals(data);
      }
    } catch (error) {
      handleApiError(error, {
        toastMessage: 'Failed to load deals'
      });
    }
  };

  const deleteDeal = async (id: string) => {
    try {
      await withLoading(async () => {
        await axios.delete(`/api/deals/${id}`);
      });
      
      toast.success('Deal deleted successfully');
      fetchDeals(); // Refresh list
    } catch (error) {
      handleApiError(error, {
        toastMessage: 'Failed to delete deal'
      });
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading deals..." />;
  }

  return (
    <div>
      {deals.map(deal => (
        <div key={deal.id}>
          {deal.title}
          <button onClick={() => deleteDeal(deal.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

## 4. Button with Loading State

```typescript
function SubmitButton() {
  const { isLoading, withLoading } = useLoading();

  const handleSubmit = async () => {
    await withLoading(async () => {
      await axios.post('/api/deals', formData);
    });
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={isLoading}
      className="btn btn-primary"
    >
      {isLoading ? (
        <>
          <ButtonSpinner className="mr-2" />
          Saving...
        </>
      ) : (
        'Save Deal'
      )}
    </button>
  );
}
```

## 5. Multiple Loading States

```typescript
import { useMultipleLoading } from './hooks/useLoading';

function Dashboard() {
  const { setLoading, isLoading, isAnyLoading } = useMultipleLoading();

  const fetchDeals = async () => {
    setLoading('deals', true);
    try {
      const data = await axios.get('/api/deals');
      setDeals(data);
    } finally {
      setLoading('deals', false);
    }
  };

  const fetchContacts = async () => {
    setLoading('contacts', true);
    try {
      const data = await axios.get('/api/contacts');
      setContacts(data);
    } finally {
      setLoading('contacts', false);
    }
  };

  return (
    <div>
      <div>
        {isLoading('deals') ? <LoadingSpinner /> : <DealsList />}
      </div>
      <div>
        {isLoading('contacts') ? <LoadingSpinner /> : <ContactsList />}
      </div>
      {isAnyLoading() && <div>Loading data...</div>}
    </div>
  );
}
```

## 6. Cache Busting

The API version is automatically added to all requests via the axios interceptor.
To bust cache after deployment, simply increment the version in `apiClient.ts`:

```typescript
const API_VERSION = '1.0.1'; // Increment this number
```

All subsequent API calls will use the new version parameter.
