function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function NavBar({ state, setState }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light">
      <a className="navbar-brand" href="#">
        Network
      </a>

      <div>
        <ul className="navbar-nav mr-auto">
          {state.is_authenticated && (
            <>
              <li className="nav-item">
                <span className="nav-link">
                  <strong>{state.username}</strong>
                </span>
              </li>
              <li className="nav-item">
                <span
                  className="nav-link"
                  onClick={(event) => {
                    event.preventDefault();
                    setState((prev) => ({
                      ...prev,
                      new_post_content: "",
                      new_post_view: "block",
                      posts_view: "none",
                    }));
                  }}
                >
                  <a href="/">New Post</a>
                </span>
              </li>
            </>
          )}

          <li className="nav-item">
            <a
              className="nav-link"
              href="/"
              onClick={(event) => {
                event.preventDefault();
                setState((prev) => ({
                  ...prev,
                  new_post_content: "",
                  new_post_view: "none",
                  posts_view: "block",
                }));
              }}
            >
              All Posts
            </a>
          </li>

          {state.is_authenticated ? (
            <>
              <li className="nav-item">
                <a className="nav-link" href="/">
                  Following
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/logout">
                  Log Out
                </a>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <a className="nav-link" href="/login">
                  Log In
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/register">
                  Register
                </a>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

function new_post_submit({ state, setState }) {
  try {
    let postContent = state.new_post_content;
    if (!postContent || postContent.length == 0) {
      alert("Post content cannot be empty.");
      return;
    }

    let content = {content: postContent};

    fetch("/new_post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(content),
    })
      .then((response) => response.json())
      .then((result) => {
        if (!result) {
          throw new Error("No response from server");
        }
        if (result.message) {
          alert("Post created successfully!");
          setState((prev) => ({
            ...prev,
            new_post_content: "",
            posts_view: "block",
            new_post_view: "none",
          }));
        } else {
          alert("Error creating post: " + result.error);
        }
      })
      .catch((error) => {
        console.error("Error submitting new post:", error);
        alert("An error occurred while submitting the post.");
      });
  } catch (error) {
    console.error("Error submitting new post:", error);
    alert("An error occurred while submitting the post.");
  }
}

function fetch_posts({pagination, setPagination}) {
  fetch("/api/pagination", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify({
      currentPage: pagination.currentPage,
      postsPerPage: pagination.postsPerPage,
    }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result) {
        setPagination((prev) => ({
          ...prev,
          totalPages: result.total_pages,
          has_next_page: result.has_next_page,
          has_previous_page: result.has_previous_page,
          current_posts: result.current_posts.map((post) => (
            <div key={post.id} className="post">
              <p>{post.content}</p>
              <small>Posted by <strong>{post.user__username}</strong> on {new Date(post.timestamp).toLocaleString()}</small>
            </div>
          )),
        }));
        console.log("current post state:", pagination);
      } else {
        console.error("Error fetching pagination data:", result);
      }
    })
    .catch((error) => {
      console.error("Error fetching pagination data:", error);
    });
}

function App() {
  const [state, setState] = React.useState({
    is_authenticated: false,
    username: null,
    new_post_content: "",
    new_post_view: "none",
    posts_view: "block",
    posts: [],
  });
  const [pagination, setPagination] = React.useState({
    currentPage: 1,
    totalPages: 1,
    postsPerPage: 10,
    has_next_page: null,
    has_previous_page: null,
    current_posts: [],
  });


  // // Pagination
  // React.useEffect(() => {

  // }, [pagination.currentPage, pagination.postsPerPage, pagination.totalPages, pagination.has_next]);

  React.useEffect(() => {
    fetch("/user")
      .then((response) => response.json())
      .then((result) => {
        setState((prev) => ({
          ...prev,
          is_authenticated: result.is_authenticated,
          username: result.username,
        }));
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        setState((prev) => ({
          ...prev,
          is_authenticated: false,
          username: null,
        }));
      });
  }, []);

  React.useEffect(() => {
    console.log("State updated:", state);
  }, [state]);

  const new_post_change = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  React.useEffect(() => {
    if (state.posts_view === "block") {
      fetch_posts({ pagination, setPagination });
    }
    // Only run when posts_view changes
  }, [state.posts_view, pagination.currentPage, pagination.postsPerPage, pagination.totalPages, pagination.has_next]);

  return (
    <>
      <NavBar state={state} setState={setState} />
      <div className="app">
        <div id="posts_view" style={{ display: state.posts_view }}>
          <h2>All Posts</h2>
          {pagination.current_posts.length > 0 ? (
            pagination.current_posts
          ) : (
            <p>No posts available. Create a new post!</p>
          )}
        </div>
        <div id="new_post_view" style={{ display: state.new_post_view }}>
          <h2>Create a New Post</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              new_post_submit({ state, setState });
            }}
          >
            <div className="form-group">
              <label htmlFor="postContent">Post Content</label>
              <textarea
                name="new_post_content"
                className="form-control"
                id="postContent"
                rows="3"
                value={state.new_post_content}
                onChange={new_post_change}
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary">
              Submit
            </button>
          </form>
        </div>
      </div>

      <div class="pagination">
        <span class="step-links">
            { pagination.has_previous_page && (
                <a href="" onClick={
                    (event) => {
                        event.preventDefault();
                        setPagination((prev) => ({
                            ...prev,
                            currentPage: prev.currentPage - 1,
                        }));
                        fetch_posts({ pagination, setPagination });
                    }
                }>Previous ({pagination.currentPage - 1})</a>
            ) }
                
            <span class="current">
                Page { pagination.currentPage } of { pagination.totalPages }.
            </span>

            { pagination.has_next_page && (
                <a href="" onClick={
                    (event) => {
                        event.preventDefault();
                        setPagination((prev) => ({
                            ...prev,
                            currentPage: prev.currentPage + 1,
                        }));
                        fetch_posts({ pagination, setPagination });
                    }
                }>Next ({pagination.currentPage + 1})</a>
            ) }
        </span>
      </div>
    </>
  );
}

ReactDOM.render(<App />, document.querySelector("#app"));
