import pandas as pd

def get_quiz_data():
    """
    Reads quiz data from an Excel file, transforms it, and returns it as a list of dictionaries.
    """
    try:
        # Define the path to the Excel file
        excel_file_path = 'Neuer_Arzttarif_Frage_Antwort_Spiel.xlsx'

        # Read the Excel file
        df = pd.read_excel(excel_file_path)

        # Initialize an empty list to store the transformed data
        questions_data = []

        # Iterate over each row in the DataFrame
        for index, row in df.iterrows():
            # Extract data from the row
            title = row['Stichwort']
            question_text = row['Frage']
            answers = [row['Antworten A'], row['Antworten B'], row['Antworten C']]
            # Convert 1-indexed correct answer to 0-indexed
            correct_answer_index = int(row['korrekte Antwort']) - 1

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
