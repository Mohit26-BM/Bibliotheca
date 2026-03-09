// ============================================================
// Supabase Proxy Function for Netlify
// Keeps SUPABASE_URL and SUPABASE_ANON_KEY server-side only
// Frontend calls this function instead of calling Supabase directly
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { action, payload } = JSON.parse(event.body);

    // Get authorization token from request header
    const authHeader = event.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No authorization token' })
      };
    }

    // Verify token with Supabase (will be validated server-side)
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Route different actions
    switch (action) {
      // Fetch all available books
      case 'getBooks':
        return await handleGetBooks();

      // Fetch user's current loans
      case 'getUserLoans':
        return await handleGetUserLoans(userData.user.id, token);

      // Fetch user's reviews
      case 'getUserReviews':
        return await handleGetUserReviews(userData.user.id, token);

      // Fetch book details
      case 'getBook':
        return await handleGetBook(payload.bookId, token);

      // Get current user profile
      case 'getCurrentUser':
        return await handleGetCurrentUser(userData.user.id, token);

      // Fetch all users (admin only)
      case 'getAllUsers':
        return await handleGetAllUsers(userData.user.id, token);

      // Get all loans (admin only)
      case 'getAllLoans':
        return await handleGetAllLoans(userData.user.id, token);

      // Insert a new book (admin only)
      case 'insertBook':
        return await handleInsertBook(payload, userData.user.id, token);

      // Update a book (admin only)
      case 'updateBook':
        return await handleUpdateBook(payload, userData.user.id, token);

      // Delete a book (admin only)
      case 'deleteBook':
        return await handleDeleteBook(payload.bookId, userData.user.id, token);

      // Create a loan
      case 'createLoan':
        return await handleCreateLoan(payload, userData.user.id, token);

      // Return a loan
      case 'returnLoan':
        return await handleReturnLoan(payload.loanId, userData.user.id, token);

      // Insert a review
      case 'insertReview':
        return await handleInsertReview(payload, userData.user.id, token);

      // Update user profile
      case 'updateUserProfile':
        return await handleUpdateUserProfile(payload, userData.user.id, token);

      // Get admin analytics
      case 'getAnalytics':
        return await handleGetAnalytics(userData.user.id, token);

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Unknown action' })
        };
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Server error' })
    };
  }
};

// ============================================================
// Handler Functions
// ============================================================

async function handleGetBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('is_available', true);

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleGetUserLoans(userId, token) {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleGetUserReviews(userId, token) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleGetBook(bookId, token) {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleGetCurrentUser(userId, token) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleGetAllUsers(userId, token) {
  // Check if requester is admin
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleGetAllLoans(userId, token) {
  // Check if requester is admin
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const { data, error } = await supabase
    .from('loans')
    .select('*');

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleInsertBook(payload, userId, token) {
  // Check if requester is admin
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const { data, error } = await supabase
    .from('books')
    .insert([payload])
    .select();

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleUpdateBook(payload, userId, token) {
  // Check if requester is admin
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const { id, ...updates } = payload;
  const { data, error } = await supabase
    .from('books')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleDeleteBook(bookId, userId, token) {
  // Check if requester is admin
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId);

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
}

async function handleCreateLoan(payload, userId, token) {
  const { data, error } = await supabase
    .from('loans')
    .insert([{ ...payload, user_id: userId }])
    .select();

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleReturnLoan(loanId, userId, token) {
  const { data, error } = await supabase
    .from('loans')
    .update({ is_returned: true, returned_at: new Date().toISOString() })
    .eq('id', loanId)
    .select();

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleInsertReview(payload, userId, token) {
  const { data, error } = await supabase
    .from('reviews')
    .insert([{ ...payload, user_id: userId }])
    .select();

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleUpdateUserProfile(payload, userId, token) {
  const { data, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', userId)
    .select();

  if (error) throw error;
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
}

async function handleGetAnalytics(userId, token) {
  // Check if requester is admin
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError || user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  const { data: bookCount } = await supabase
    .from('books')
    .select('id', { count: 'exact', head: true });

  const { data: userCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });

  const { data: loanCount } = await supabase
    .from('loans')
    .select('id', { count: 'exact', head: true });

  return {
    statusCode: 200,
    body: JSON.stringify({
      totalBooks: bookCount?.length || 0,
      totalUsers: userCount?.length || 0,
      totalLoans: loanCount?.length || 0
    })
  };
}
