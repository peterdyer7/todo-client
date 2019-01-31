import React, { useState, useEffect } from 'react';
import gql from 'graphql-tag';
import { Query, Mutation, Subscription } from 'react-apollo';

const LIST_TODOS_QUERY = gql`
  query ListTodos {
    listTodos {
      id
      name
      description
      notes {
        id
        text
      }
    }
  }
`;

const GET_TODO_QUERY = gql`
  query GetTodo($todoId: ID!) {
    getTodo(id: $todoId) {
      id
      name
      description
      notes {
        id
        text
      }
    }
  }
`;

function TodoList({ setSelected }) {
  return (
    <Query
      query={LIST_TODOS_QUERY}
      // pollInterval={5000}
    >
      {({ loading, error, data }) => {
        if (loading) return <p>Loading...</p>;
        if (error) return <p>Error! {error.message}</p>;
        if (!data) return <p>No todos!</p>;
        return (
          <ul>
            {data.listTodos.map((todo) => (
              <li key={todo.id}>
                {todo.name} - {todo.id < 0 ? 'optimistic' : 'real'}
                &emsp;
                <button onClick={() => setSelected(todo.id)}>Details</button>
              </li>
            ))}
          </ul>
        );
      }}
    </Query>
  );
}

function TodoNew() {
  return (
    <Subscription
      subscription={gql`
        subscription TodoAdded {
          todoAdded {
            id
            name
            description
          }
        }
      `}
    >
      {({ loading, error, data }) => {
        if (loading) return null;
        if (error) return <p>Error! {error.message}</p>;
        return (
          <>
            <br />
            {data && data.todoAdded && <h4>New todo: {data.todoAdded.name}</h4>}
            <br />
          </>
        );
      }}
    </Subscription>
  );
}

function TodoAdd() {
  const handleKeyPress = (e, addTodo) => {
    if (e.keyCode === 13) {
      addTodo({
        variables: { input: { name: e.target.value } },
        optimisticResponse: {
          addTodo: {
            name: e.target.value,
            id: Math.round(Math.random() * -1000000),
            description: '',
            notes: [],
            __typename: 'Todo'
          }
        },
        update: (cache, { data: { addTodo } }) => {
          const cachedTodos = cache.readQuery({
            query: LIST_TODOS_QUERY
          });
          cachedTodos.listTodos.push(addTodo);
          cache.writeQuery({
            query: LIST_TODOS_QUERY,
            data: cachedTodos
          });
        }
      });
      e.target.value = '';
    }
  };

  return (
    <Mutation
      mutation={gql`
        mutation AddTodo($input: TodoInput) {
          addTodo(input: $input) {
            id
            name
            description
            notes {
              id
              text
            }
          }
        }
      `}
    >
      {(addTodo, { data }) => (
        <input
          type="text"
          placeholder="New todo..."
          onKeyUp={(e) => handleKeyPress(e, addTodo)}
        />
      )}
    </Mutation>
  );
}

function TodoDetail({ selected }) {
  return (
    <Query
      query={GET_TODO_QUERY}
      variables={{ todoId: selected }}
      fetchPolicy={'cache-first'}
    >
      {({ loading, error, data, subscribeToMore }) => {
        if (loading) return <p>Loading...</p>;
        if (error) return <p>Error! {error.message}</p>;

        const subscribeToNewNotes = () => {
          const unsubscribe = subscribeToMore({
            document: gql`
              subscription onNoteAdded($todoId: ID!) {
                noteAdded(todoId: $todoId) {
                  id
                  text
                }
              }
            `,
            variables: { todoId: selected },
            updateQuery: (prev, { subscriptionData }) => {
              if (!subscriptionData.data) return prev;
              const newNote = subscriptionData.data.noteAdded;
              const newData = {
                ...prev,
                getTodo: {
                  ...prev.getTodo,
                  notes: [...prev.getTodo.notes, newNote]
                }
              };
              return newData;
            }
          });
          return unsubscribe;
        };

        return (
          <TodoDetailView data={data} subscribeToMore={subscribeToNewNotes} />
        );
      }}
    </Query>
  );
}

function TodoDetailView({ data, subscribeToMore }) {
  useEffect(() => {
    const unsubscribe = subscribeToMore();
    return () => unsubscribe();
  });

  return (
    <>
      <h3>Details</h3>
      <h4>{data.getTodo.name}</h4>
      Notes
      <br />
      {data.getTodo.notes &&
        data.getTodo.notes.map((note) => <li key={note.id}>{note.text}</li>)}
    </>
  );
}

function NoteAdd({ selected }) {
  const handleKeyPress = (e, addNote) => {
    if (e.keyCode === 13) {
      addNote({
        variables: { input: { id: selected, text: e.target.value } },
        optimisticResponse: {
          addNote: {
            text: e.target.value,
            id: Math.round(Math.random() * -1000000),
            __typename: 'Note'
          }
        },
        update: (cache, { data: { addNote } }) => {
          const cachedTodo = cache.readQuery({
            query: GET_TODO_QUERY,
            variables: { todoId: selected }
          });
          if (
            !cachedTodo.getTodo.notes.find((note) => note.id === addNote.id)
          ) {
            cachedTodo.getTodo.notes.push(addNote);
            cache.writeQuery({
              query: GET_TODO_QUERY,
              variables: { todoId: selected },
              data: cachedTodo
            });
          }
        }
      });
      e.target.value = '';
    }
  };

  return (
    <Mutation
      mutation={gql`
        mutation AddNote($input: NoteInput) {
          addNote(input: $input) {
            id
            text
          }
        }
      `}
    >
      {(addNote, { data }) => (
        <input
          type="text"
          placeholder="Add note..."
          onKeyUp={(e) => handleKeyPress(e, addNote)}
        />
      )}
    </Mutation>
  );
}

function Network() {
  return (
    <Query
      query={gql`
        query NetworkStatus {
          networkStatus @client {
            isConnected
          }
        }
      `}
    >
      {({ loading, error, data }) => {
        if (loading) return <p>Loading...</p>;
        if (error) return <p>Error! {error.message}</p>;
        const { networkStatus } = data;
        return (
          <>
            Network status:{' '}
            {networkStatus.isConnected ? 'Connected' : 'Disconnected'}{' '}
            <Mutation
              mutation={gql`
                mutation UpdateNetworkStatus($isConnected: Boolen) {
                  updateNetworkStatus(isConnected: $isConnected) @client
                }
              `}
            >
              {(mutate, { data }) => (
                <>
                  <button
                    onClick={() =>
                      mutate({
                        variables: { isConnected: !networkStatus.isConnected }
                      })
                    }
                  >
                    Toggle
                  </button>
                </>
              )}
            </Mutation>
            <br />
            <br />
          </>
        );
      }}
    </Query>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <h1>Opti App</h1>
      <Network />
      <TodoAdd />
      <TodoList setSelected={setSelected} />
      <TodoNew />
      {selected && <TodoDetail selected={selected} />}
      {selected && <NoteAdd selected={selected} />}
    </>
  );
}
