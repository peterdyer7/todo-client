import React from 'react';
import gql from 'graphql-tag';
import { Query, Mutation } from 'react-apollo';

const LIST_TODOS_QUERY = gql`
  query ListTodos {
    listTodos {
      id
      name
    }
  }
`;

function TodoList() {
  return (
    <Query
      query={LIST_TODOS_QUERY}
      // pollInterval={5000}
    >
      {({ loading, error, data }) => {
        if (loading) return <p>Loading...</p>;
        if (error) return <p>Error!</p>;
        return (
          <ul>
            {data.listTodos.map((todo) => (
              <li key={todo.id}>
                {todo.name} - {todo.id < 0 ? 'optimistic' : 'real'}
              </li>
            ))}
          </ul>
        );
      }}
    </Query>
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
        //refetchQueries: ['ListTodos']
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

export default function App() {
  return (
    <>
      <h1>Opti App</h1>
      <TodoAdd />
      <TodoList />
    </>
  );
}
