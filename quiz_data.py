import pandas as pd

def get_quiz_data():
    """
    Reads quiz data from an Excel file, transforms it, and returns it as a list of dictionaries.
    """
    # Define the path to the Excel file
    excel_file_path = 'Neuer_Arzttarif_Frage_Antwort_Spiel.xlsx'
    try:
        # Read the Excel file
        df = pd.read_excel(excel_file_path)

        expected_columns = ['Stichwort', 'Frage', 'Antwort_1', 'Antwort_2', 'Antwort_3', 'Korrekte_Antwort']
        actual_columns = df.columns.tolist()
        missing_columns = [col for col in expected_columns if col not in actual_columns]

        if missing_columns:
            print(f"Error: The Excel file is missing the following expected columns: {missing_columns}")
            print(f"The columns found in the Excel file are: {actual_columns}")
            return []

        # Initialize an empty list to store the transformed data
        questions_data = []

        # Iterate over each row in the DataFrame
        for index, row in df.iterrows():
            # Extract data from the row
            title = row['Stichwort']
            question_text = row['Frage']
            answers = [row['Antwort_1'], row['Antwort_2'], row['Antwort_3']]
            # Convert 1-indexed correct answer to 0-indexed
            correct_answer_index = int(row['Korrekte_Antwort']) - 1

            # Create a dictionary for the current question
            question_dict = {
                'title': title,
                'question': question_text,
                'answers': answers,
                'correct_answer_index': correct_answer_index
            }

            # Add the dictionary to the list
            questions_data.append(question_dict)
        
        return questions_data

    except FileNotFoundError:
        print(f"Error: The file {excel_file_path} was not found.")
        return []
    except Exception as e:
        print(f"An error occurred: {e}")
        return []

# Store the data in a variable when the module is loaded
questions_data = get_quiz_data()

if __name__ == '__main__':
    # This part is for testing the function
    data = get_quiz_data()
    if data:
        print(f"Successfully loaded {len(data)} questions.")
        # Print the first question as a sample
        if data:
            print("\nSample question:")
            print(data[0])
    else:
        print("No data loaded.")
